from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse, Response
from fpdf import FPDF
import tempfile
import os
import json
from datetime import datetime
from typing import Optional, List
from app.schemas.investigation import InvestigationCreate, Investigation
from app.schemas.observation import ObservationCreate, Observation
from app.schemas.fusion import InvestigationResult
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.detection_repository import DetectionRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.vessel_repository import VesselRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.vessel_repository import VesselRepository
from app.repositories.attribution_repository import attribution_repo
from app.services.investigation_orchestrator import orchestrator
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

inv_repo = InvestigationRepository()
obs_repo = ObservationRepository()
det_repo = DetectionRepository()
rec_repo = ReconstructionRepository()
vessel_repo = VesselRepository()

@router.post("", response_model=Investigation)
@router.post("/", response_model=Investigation)
async def create_investigation(inv_in: InvestigationCreate):
    return await inv_repo.create(inv_in)

@router.get("/alerts")
async def get_alerts():
    # Fetch latest 10 investigations to serve as mock alerts
    invs = await inv_repo.collection.find().sort("created_at", -1).to_list(10)
    alerts = []
    for inv in invs:
        # Generate an alert format based on the investigation
        alerts.append({
            "_id": str(inv["_id"]),
            "investigation_id": str(inv["_id"]),
            "observation_id": inv.get("observation_ids", ["unknown"])[0] if inv.get("observation_ids") else "N/A",
            "timestamp": inv.get("created_at", "").isoformat() if hasattr(inv.get("created_at", ""), "isoformat") else str(inv.get("created_at", "")),
            "satellite": "Sentinel-1",
            "image_file": "placeholder.png"
        })
    return {"success": True, "alerts": alerts}

@router.get("/spills")
async def get_active_spills():
    invs = await inv_repo.list()
    results = []
    for inv in invs:
        # Get det for area and loc
        det = await det_repo.get_by_investigation(inv.id)
        
        area = det.area_km2 if (det and det.area_km2 is not None) else (round(float(det.area_pct) * 0.25, 2) if (det and getattr(det, "area_pct", None) is not None) else 0.0)
        lat, lng = 19.0, 72.8 # default
        
        if det and det.geometry and "coordinates" in det.geometry:
            coords = det.geometry["coordinates"]
            pts = []
            def get_pts(c):
                if isinstance(c, (list, tuple)):
                    if len(c) >= 2 and isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                        pts.append(c)
                    else:
                        for sub in c:
                            get_pts(sub)
            get_pts(coords)
            if pts:
                lng = sum([p[0] for p in pts]) / len(pts)
                lat = sum([p[1] for p in pts]) / len(pts)

        h_lat, h_lng = lat + 0.05, lng + 0.05
        rec = await rec_repo.get_by_investigation(inv.id)
        if rec and getattr(rec, "hindcast_track", None) and len(rec.hindcast_track) > 0:
            h_lat = rec.hindcast_track[-1].get("lat", h_lat)
            h_lng = rec.hindcast_track[-1].get("lon", h_lng)
        elif rec and rec.source_region and "coordinates" in rec.source_region:
            s_pts = []
            def get_s_pts(c):
                if isinstance(c, (list, tuple)):
                    if len(c) >= 2 and isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                        s_pts.append(c)
                    else:
                        for sub in c:
                            get_s_pts(sub)
            get_s_pts(rec.source_region["coordinates"])
            if s_pts:
                h_lng = sum([p[0] for p in s_pts]) / len(s_pts)
                h_lat = sum([p[1] for p in s_pts]) / len(s_pts)
        
        results.append({
            "id": inv.id,
            "name": f"Incident-{inv.id[-4:].upper()}",
            "detectedAt": inv.created_at.isoformat(),
            "status": "RESOLVED" if inv.status == "COMPLETED" else "ACTIVE",
            "areaSqKm": area,
            "currentLocation": {"lat": round(lat, 4), "lng": round(lng, 4)},
            "hindcastOrigin": {"lat": round(h_lat, 4), "lng": round(h_lng, 4)},
            "culpritFound": len(inv.candidate_ids) > 0 if inv.candidate_ids else False
        })
    return {"success": True, "data": results}

@router.get("/{id}", response_model=Investigation)
async def get_investigation(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

from fastapi import UploadFile, File, Form
import cloudinary
import cloudinary.uploader
from app.core.config import settings

# Configure Cloudinary using settings
cloudinary.config( 
    cloud_name = settings.cloudinary_cloud_name, 
    api_key = settings.cloudinary_api_key, 
    api_secret = settings.cloudinary_api_secret,
    secure=True
)

@router.post("/{id}/observations", response_model=Observation)
async def add_observation(
    id: str, 
    timestamp: str = Form(...),
    sensor: str = Form(...),
    resolution_m: Optional[float] = Form(None),
    lat: Optional[float] = Form(19.0),
    lon: Optional[float] = Form(72.8),
    file: UploadFile = File(...)
):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    # Upload the file to Cloudinary
    try:
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="kairos_observations"
        )
        image_url = upload_result.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")
        
    # Create the observation
    from datetime import datetime
    import json
    
    # Simple polygon bounds around the provided lat/lon
    # Create a roughly 30x30km box around the lat/lon
    offset = 0.15 # approx 15km
    generated_bounds = {
        "type": "Polygon",
        "coordinates": [[[lon - offset, lat - offset], [lon + offset, lat - offset], [lon + offset, lat + offset], [lon - offset, lat + offset], [lon - offset, lat - offset]]]
    }
    
    obs_in = ObservationCreate(
        timestamp=datetime.fromisoformat(timestamp.replace("Z", "+00:00")),
        sensor=sensor,
        resolution_m=resolution_m,
        image_reference=image_url,
        geospatial_bounds=generated_bounds
    )
    
    obs = await obs_repo.create(obs_in, id)
    await inv_repo.update(id, {"observation_ids": inv.observation_ids + [obs.id]})
    return obs

@router.get("/{id}/observations")
async def get_observations(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    obs_list = await obs_repo.get_by_investigation(id)
    det = await det_repo.get_by_investigation(id)
    rec = await rec_repo.get_by_investigation(id)
    
    env = rec.parameters.get("environment") if rec and hasattr(rec, "parameters") and rec.parameters else None
    if not env and rec:
        from app.services.environment_service import environment_service
        env = environment_service.get_for_region_and_time(
            geometry=det.geometry if det else {},
            start_time=obs_list[0].timestamp if obs_list else rec.created_at,
            end_time=obs_list[0].timestamp if obs_list else rec.created_at
        ).model_dump()
        
    # Extract spill centroid from detection geometry if available
    spill_lat, spill_lon = None, None
    if det and det.geometry and "coordinates" in det.geometry:
        coords = det.geometry["coordinates"]
        pts = []
        def extract_pts(c):
            if isinstance(c, (list, tuple)):
                if len(c) >= 2 and isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                    pts.append(c)
                else:
                    for sub in c:
                        extract_pts(sub)
        extract_pts(coords)
        if pts:
            spill_lon = sum([p[0] for p in pts]) / len(pts)
            spill_lat = sum([p[1] for p in pts]) / len(pts)

    results = []
    for obs in obs_list:
        d = obs.model_dump(by_alias=True)
        lat, lon = spill_lat, spill_lon
        if (lat is None or lon is None) and obs.geospatial_bounds and "coordinates" in obs.geospatial_bounds:
            b_coords = obs.geospatial_bounds["coordinates"]
            b_pts = []
            def extract_b(c):
                if isinstance(c, (list, tuple)):
                    if len(c) >= 2 and isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                        b_pts.append(c)
                    else:
                        for sub in c:
                            extract_b(sub)
            extract_b(b_coords)
            if b_pts:
                lon = sum([p[0] for p in b_pts]) / len(b_pts)
                lat = sum([p[1] for p in b_pts]) / len(b_pts)
                
        d["spill_location"] = f"{lat:.2f}°N, {lon:.2f}°E" if lat is not None and lon is not None else None
        d["spill_lat"] = round(lat, 4) if lat is not None else None
        d["spill_lon"] = round(lon, 4) if lon is not None else None
        d["wind_speed"] = f"{env.get('wind_speed_kn')} kn" if env and env.get("wind_speed_kn") is not None else None
        d["wind_speed_kn"] = env.get("wind_speed_kn") if env else None
        
        # Oil spill type from metadata or detection
        oil_type = None
        if obs.metadata and isinstance(obs.metadata, dict):
            oil_type = obs.metadata.get("oil_spill_type") or obs.metadata.get("oil_type")
        if not oil_type and det and det.detected:
            oil_type = "Crude / Heavy Marine Fuel"
        d["oil_spill_type"] = oil_type
        
        results.append(d)
        
    return results

@router.post("/{id}/analyze")
async def trigger_analysis(id: str, background_tasks: BackgroundTasks):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    background_tasks.add_task(orchestrator.analyze, id)
    return {"job_id": id, "status": "QUEUED"}

@router.get("/{id}/full")
async def get_full_investigation(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        doc = await inv_repo.collection.find_one({"observation_ids": id})
        if doc:
            inv = await inv_repo.get(str(doc["_id"]))
            id = str(doc["_id"])
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    obs = await obs_repo.get_by_investigation(id)
    det = await det_repo.get_by_investigation(id)
    rec = await rec_repo.get_by_investigation(id)
    
    det_dict = det.model_dump(by_alias=True) if det else None
    if det_dict and det_dict.get("area_km2") is None and det_dict.get("area_pct") is not None:
        det_dict["area_km2"] = round(float(det_dict["area_pct"]) * 0.25, 2)
        
    env = rec.parameters.get("environment") if rec and hasattr(rec, "parameters") and rec.parameters else None
    if not env and rec:
        from app.services.environment_service import environment_service
        env = environment_service.get_for_region_and_time(
            geometry=det.geometry if det else {},
            start_time=obs[0].timestamp if obs else rec.created_at,
            end_time=obs[0].timestamp if obs else rec.created_at
        ).model_dump()

    # Fetch persisted attribution results
    attr_data = await attribution_repo.get_by_investigation(id)
    if not attr_data and getattr(inv, "attribution_id", None):
        from bson import ObjectId
        attr_id = inv.attribution_id
        attr_data = await attribution_repo.collection.find_one({
            "_id": ObjectId(attr_id) if ObjectId.is_valid(attr_id) else attr_id
        })

    candidates = []
    attribution_meta = None

    if attr_data and "ranked_candidates" in attr_data:
        candidates = attr_data["ranked_candidates"]
        attribution_meta = {
            "status": "COMPLETED",
            "attribution_id": str(attr_data.get("_id", "")),
            "candidate_count": len(candidates)
        }
    elif getattr(inv, "candidate_ids", None) and len(inv.candidate_ids) > 0:
        # Secondary fallback: resolve vessels directly from vessel repository
        for idx, v_id in enumerate(inv.candidate_ids):
            v_track = await vessel_repo.get(v_id)
            if v_track:
                candidates.append({
                    "rank": idx + 1,
                    "vessel": v_track.model_dump() if hasattr(v_track, "model_dump") else v_track,
                    "attribution_score": 1.0,
                    "evidence": {
                        "spatial": 1.0,
                        "temporal": 1.0,
                        "drift": 1.0,
                        "trajectory": 1.0,
                        "ais_quality": 1.0
                    },
                    "explanations": ["Vessel trajectory directly intersected the inner bounds of the hindcast source region."]
                })
        if candidates:
            attribution_meta = {
                "status": "COMPLETED",
                "attribution_id": getattr(inv, "attribution_id", None) or "resolved_from_vessels",
                "candidate_count": len(candidates)
            }
    elif inv.status == "ANALYZING":
        attribution_meta = {"status": "PENDING"}
    elif inv.status == "FAILED":
        attribution_meta = {
            "status": "FAILED",
            "reason": inv.failure.message if (hasattr(inv, "failure") and inv.failure) else "Investigation analysis failed"
        }
    elif inv.status == "COMPLETED":
        attribution_meta = {
            "status": "NO_CANDIDATES",
            "candidate_count": 0
        }
    else:
        attribution_meta = {"status": "NOT_STARTED"}

    response = {
        "investigation": inv.model_dump(by_alias=True) if inv else None,
        "observation": obs[0].model_dump(by_alias=True) if obs else None,
        "detection": det_dict,
        "reconstruction": rec.model_dump(by_alias=True) if rec else None,
        "environment": env,
        "candidates": candidates,
        "attribution": attribution_meta
    }
            
    return response


@router.get("/{id}/report")
async def generate_report(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    obs = await obs_repo.get_by_investigation(id)
    det = await det_repo.get_by_investigation(id)
    rec = await rec_repo.get_by_investigation(id)
    
    env = rec.parameters.get("environment") if rec and hasattr(rec, "parameters") and rec.parameters else None
    if not env and rec:
        from app.services.environment_service import environment_service
        env = environment_service.get_for_region_and_time(
            geometry=det.geometry if det else {},
            start_time=obs[0].timestamp if obs else rec.created_at,
            end_time=obs[0].timestamp if obs else rec.created_at
        ).model_dump()

    # Fetch persisted attribution results
    attr_data = await attribution_repo.get_by_investigation(id)
    candidates = []
    if attr_data and "ranked_candidates" in attr_data:
        candidates = attr_data["ranked_candidates"]

    from app.services.report_generator import generate_investigation_report_pdf
    pdf_path = generate_investigation_report_pdf(
        inv=inv,
        obs_list=obs or [],
        det=det,
        rec=rec,
        env=env,
        candidates=candidates
    )
    
    return FileResponse(
        pdf_path,
        media_type='application/pdf',
        filename=f"Kairos_Report_{id}.pdf"
    )


@router.get("/{id}/export/geojson")
async def export_geojson(id: str):
    """
    Exports the investigation as a GeoJSON FeatureCollection -- the detected
    slick polygon, the estimated release-origin region, the hindcast/forecast
    drift tracks, and each ranked suspect vessel's track and latest position.
    Meant to be imported directly into GIS tools (QGIS, ArcGIS, Google Earth)
    used by real spill-response and enforcement teams.
    """
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    det = await det_repo.get_by_investigation(id)
    rec = await rec_repo.get_by_investigation(id)
    attr_data = await attribution_repo.get_by_investigation(id)
    candidates = []
    if attr_data and "ranked_candidates" in attr_data:
        candidates = attr_data["ranked_candidates"]

    features = []

    if det and getattr(det, "geometry", None):
        features.append({
            "type": "Feature",
            "geometry": det.geometry,
            "properties": {
                "feature_type": "oil_spill_detection",
                "confidence": getattr(det, "confidence", None),
                "area_km2": getattr(det, "area_km2", None),
                "area_pct": getattr(det, "area_pct", None),
            }
        })

    if rec and getattr(rec, "source_region", None):
        features.append({
            "type": "Feature",
            "geometry": rec.source_region,
            "properties": {
                "feature_type": "estimated_release_origin",
                "uncertainty_km": getattr(rec, "uncertainty_km", None),
                "release_window_start": rec.release_window.start_time.isoformat() if rec.release_window else None,
                "release_window_end": rec.release_window.end_time.isoformat() if rec.release_window else None,
            }
        })

    def track_to_linestring(track_points, feature_type):
        coords = []
        for p in (track_points or []):
            lat = p.get("lat") if isinstance(p, dict) else None
            lon = p.get("lon") if isinstance(p, dict) else None
            if lat is not None and lon is not None:
                coords.append([lon, lat])
        if len(coords) < 2:
            return None
        return {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {"feature_type": feature_type}
        }

    if rec:
        hindcast_feat = track_to_linestring(getattr(rec, "hindcast_track", None), "hindcast_track")
        if hindcast_feat:
            features.append(hindcast_feat)
        forecast_feat = track_to_linestring(getattr(rec, "forecast_track", None), "forecast_track")
        if forecast_feat:
            features.append(forecast_feat)

    for cand in candidates:
        vessel = cand.get("vessel", {}) if isinstance(cand, dict) else {}
        positions = vessel.get("positions", []) if isinstance(vessel, dict) else []
        coords = []
        for pos in positions:
            loc = pos.get("location", {}) if isinstance(pos, dict) else {}
            c = loc.get("coordinates") if isinstance(loc, dict) else None
            if c and len(c) == 2:
                coords.append(c)  # GeoJSON Point coords are already [lon, lat]

        vessel_props = {
            "vessel_id": vessel.get("vessel_id"),
            "name": vessel.get("name"),
            "mmsi": vessel.get("mmsi"),
            "rank": cand.get("rank") if isinstance(cand, dict) else None,
            "attribution_score": cand.get("attribution_score") if isinstance(cand, dict) else None,
        }

        if len(coords) >= 2:
            features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {"feature_type": "vessel_track", **vessel_props}
            })
        if coords:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": coords[-1]},
                "properties": {"feature_type": "vessel_latest_position", **vessel_props}
            })

    feature_collection = {
        "type": "FeatureCollection",
        "properties": {
            "investigation_id": id,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "source": "OilTraceAI"
        },
        "features": features
    }

    body = json.dumps(feature_collection, default=str, indent=2)
    return Response(
        content=body,
        media_type="application/geo+json",
        headers={"Content-Disposition": f'attachment; filename="investigation_{id}.geojson"'}
    )

@router.get("/{id}/timeline")
async def get_timeline(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    events = []
    
    events.append({
        "timestamp": inv.created_at.isoformat() if getattr(inv, 'created_at', None) else "Unknown",
        "event": "Investigation workspace initialized"
    })
    
    obs_list = await obs_repo.get_by_investigation(id)
    if obs_list:
        obs = obs_list[0]
        events.append({
            "timestamp": obs.timestamp.isoformat(),
            "event": f"SAR observation ({obs.sensor}) recorded"
        })
        
    det = await det_repo.get_by_investigation(id)
    if det:
        events.append({
            "timestamp": det.created_at.isoformat() if getattr(det, 'created_at', None) else "Unknown",
            "event": "ML detection completed - Slick found" if det.detected else "ML detection completed - No slick"
        })
        
    rec = await rec_repo.get_by_investigation(id)
    if rec:
        events.append({
            "timestamp": rec.created_at.isoformat() if getattr(rec, 'created_at', None) else "Unknown",
            "event": "Drift reconstruction completed. Source region estimated."
        })
        
    if inv.status == "COMPLETED" and rec:
        events.append({
            "timestamp": inv.updated_at.isoformat() if getattr(inv, 'updated_at', None) else "Unknown",
            "event": f"Candidate analysis completed. {len(inv.candidate_ids)} potential sources ranked."
        })
    elif inv.status == "FAILED":
        events.append({
            "timestamp": inv.updated_at.isoformat() if getattr(inv, 'updated_at', None) else "Unknown",
            "event": "Analysis failed."
        })
        
    return events
