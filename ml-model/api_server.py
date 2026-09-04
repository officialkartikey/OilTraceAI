import base64
import os
from datetime import datetime, timedelta

import cv2
import numpy as np
import torch
import segmentation_models_pytorch as smp
import albumentations as A
from albumentations.pytorch import ToTensorV2
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from drift_model import compute_drift_velocity, simulate_track
from fetch_ocean_data import get_environmental_conditions
from score_vessels import score_vessel_track

CHECKPOINT_PATH = os.environ.get("MODEL_CHECKPOINT", "best_model.pth")
IMG_SIZE = 512

app = FastAPI(title="Oil Spill Detection, Drift & Attribution API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = None


@app.on_event("startup")
def load_model():
    global model
    model = smp.Unet(
        encoder_name="resnet34",
        encoder_weights=None,
        in_channels=3,
        classes=2,
    ).to(device)
    model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=device))
    model.eval()
    print(f"Model loaded from {CHECKPOINT_PATH} on device={device}")


def predict_with_tta(image_tensor):
    with torch.no_grad():
        out0 = torch.softmax(model(image_tensor.to(device)), dim=1)

        img_h = torch.flip(image_tensor, dims=[3]).to(device)
        out_h = torch.flip(torch.softmax(model(img_h), dim=1), dims=[3])

        img_v = torch.flip(image_tensor, dims=[2]).to(device)
        out_v = torch.flip(torch.softmax(model(img_v), dim=1), dims=[2])

        avg = (out0 + out_h + out_v) / 3.0
        return avg


def run_detection(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    orig_h, orig_w = image_rgb.shape[:2]

    transform = A.Compose([
        A.Resize(IMG_SIZE, IMG_SIZE),
        A.Normalize(),
        ToTensorV2(),
    ])
    tensor = transform(image=image_rgb)["image"].unsqueeze(0)

    probs = predict_with_tta(tensor)
    pred_mask = torch.argmax(probs, dim=1).squeeze(0).cpu().numpy()
    confidence = float(torch.max(probs, dim=1).values.mean().cpu())

    pred_mask_resized = cv2.resize(
        pred_mask.astype(np.uint8), (orig_w, orig_h),
        interpolation=cv2.INTER_NEAREST
    )

    oil_pct = float(100 * pred_mask_resized.sum() / pred_mask_resized.size)
    _, buffer = cv2.imencode(".png", pred_mask_resized * 255)
    mask_b64 = base64.b64encode(buffer).decode("utf-8")

    ys, xs = np.where(pred_mask_resized > 0)
    if len(xs) > 0:
        bbox = {
            "x_min": int(xs.min()), "x_max": int(xs.max()),
            "y_min": int(ys.min()), "y_max": int(ys.max()),
        }
        centroid_px = {"x": int(xs.mean()), "y": int(ys.mean())}
    else:
        bbox = None
        centroid_px = None

    return {
        "slick_detected": oil_pct > 0.5,
        "confidence": round(confidence, 3),
        "area_pct": round(oil_pct, 2),
        "mask_base64": mask_b64,
        "bounding_box_px": bbox,
        "centroid_px": centroid_px,
    }


def run_drift(spill_lat, spill_lon, spill_time_str, hindcast_hours=6, forecast_hours=12, auto_fetch=True):
    spill_time = datetime.strptime(spill_time_str, "%Y-%m-%d %H:%M:%S")

    if auto_fetch:
        conditions = get_environmental_conditions(spill_lat, spill_lon, spill_time.strftime("%Y-%m-%dT%H:%M"))
        current_speed, current_dir = conditions["current_speed_kn"], conditions["current_dir_deg"]
        wind_speed, wind_dir = conditions["wind_speed_kn"], conditions["wind_dir_deg"]
    else:
        current_speed, current_dir, wind_speed, wind_dir = 0.5, 45, 15, 90

    current_speed_kmh = current_speed * 1.852
    wind_speed_kmh = wind_speed * 1.852
    dx_kmh, dy_kmh = compute_drift_velocity(current_speed_kmh, current_dir, wind_speed_kmh, wind_dir)

    hindcast_track = simulate_track(
        spill_lat, spill_lon, spill_time, dx_kmh, dy_kmh,
        duration_hours=hindcast_hours, reverse=True
    )
    forecast_track = simulate_track(
        spill_lat, spill_lon, spill_time, dx_kmh, dy_kmh,
        duration_hours=forecast_hours, reverse=False
    )

    origin_time, origin_lat, origin_lon = hindcast_track[0]
    final_time, final_lat, final_lon = forecast_track[-1]

    return {
        "environmental_inputs": {
            "current_speed_kn": current_speed, "current_dir_deg": current_dir,
            "wind_speed_kn": wind_speed, "wind_dir_deg": wind_dir,
        },
        "hindcast": {
            "estimated_origin": {"lat": round(origin_lat, 5), "lon": round(origin_lon, 5)},
            "estimated_origin_time": origin_time.isoformat(),
            "track": [{"time": t.isoformat(), "lat": round(la, 5), "lon": round(lo, 5)} for t, la, lo in hindcast_track],
        },
        "forecast": {
            "horizon_hours": forecast_hours,
            "predicted_position": {"lat": round(final_lat, 5), "lon": round(final_lon, 5), "time": final_time.isoformat()},
            "track": [{"time": t.isoformat(), "lat": round(la, 5), "lon": round(lo, 5)} for t, la, lo in forecast_track],
        },
    }, (origin_lat, origin_lon, origin_time)


def run_attribution(ais_csv_path, origin_lat, origin_lon, origin_time, top_k=5):
    df = pd.read_csv(ais_csv_path)
    results = []
    for mmsi, track in df.groupby("MMSI"):
        results.append(score_vessel_track(track, origin_lat, origin_lon, origin_time))

    results_df = pd.DataFrame(results).sort_values("suspect_score", ascending=False)
    top = results_df.head(top_k)

    suspects = []
    for _, row in top.iterrows():
        flags = []
        if row["speed_anomaly_score"] > 0.3:
            flags.append("speed_drop_detected")
        if row["course_anomaly_score"] > 0.3:
            flags.append("erratic_course")
        suspects.append({
            "mmsi": int(row["MMSI"]),
            "suspect_score": round(float(row["suspect_score"]), 3),
            "proximity_km": round(float(row["closest_dist_km"]), 2),
            "time_offset_hr": round(float(row["closest_time_diff_hr"]), 2),
            "flags": flags,
        })

    return {
        "vessels_analyzed": len(results_df),
        "suspects": suspects,
    }


class AnalyzeRequest(BaseModel):
    spill_time: str
    ais_csv_path: str
    run_drift: bool = True
    run_attribution: bool = True
    auto_fetch_ocean_data: bool = True


@app.get("/health")
def health():
    return {"status": "ok", "device": device}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), spill_time: str = None,
                   spill_lat: float = 19.05, spill_lon: float = 72.85,
                   ais_csv_path: str = None, auto_fetch_ocean_data: bool = True):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    image_bytes = await file.read()
    detection = run_detection(image_bytes)

    response = {
        "observation_id": f"OBS-{datetime.utcnow().strftime('%Y-%m-%d-%H%M')}",
        "model": {
            "name": "SENTRY-OilSpillNet",
            "version": "v1.0.0",
            "components": {
                "detection": "unet-resnet34",
                "drift": "leeway-hindcast-v1",
                "attribution": "ais-correlation-v1",
            },
        },
        "observation": {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sensor": "SAR",
            "satellite": "Sentinel-1",
            "resolution_m": 10,
        },
        "detection": {
            "slick_detected": detection["slick_detected"],
            "confidence": detection["confidence"],
            "area_pct": detection["area_pct"],
            "bounding_box_px": detection["bounding_box_px"],
            "centroid_px": detection["centroid_px"],
        },
        "artifacts": {
            "mask_base64": detection["mask_base64"],
        },
        "quality": {
            "detection_confidence": detection["confidence"],
        },
    }

    if not detection["slick_detected"]:
        return response

    if spill_time and ais_csv_path:
        drift_result, (origin_lat, origin_lon, origin_time) = run_drift(
            spill_lat=spill_lat, spill_lon=spill_lon,
            spill_time_str=spill_time,
            auto_fetch=auto_fetch_ocean_data,
        )
        response["drift"] = drift_result
        response["quality"]["drift_model_confidence"] = 0.6

        if os.path.exists(ais_csv_path):
            attribution_result = run_attribution(ais_csv_path, origin_lat, origin_lon, origin_time)
            response["attribution"] = attribution_result
            if attribution_result["suspects"]:
                response["quality"]["attribution_confidence"] = attribution_result["suspects"][0]["suspect_score"]

    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
