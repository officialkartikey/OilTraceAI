
import argparse
from datetime import datetime

import numpy as np
import pandas as pd

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))

def score_vessel_track(track, spill_lat, spill_lon, spill_time,
                        proximity_scale_km=10.0, timing_scale_hours=6.0):
    track = track.copy()
    track["BaseDateTime"] = pd.to_datetime(track["BaseDateTime"])
    track["dist_km"] = haversine_km(track["LAT"], track["LON"], spill_lat, spill_lon)
    track["time_diff_hr"] = (track["BaseDateTime"] - spill_time).dt.total_seconds().abs() / 3600.0

    track["space_time_dist"] = track["dist_km"] / proximity_scale_km + track["time_diff_hr"] / timing_scale_hours
    closest_idx = track["space_time_dist"].idxmin()
    closest = track.loc[closest_idx]

    proximity_score = np.exp(-closest["dist_km"] / proximity_scale_km)

    timing_score = np.exp(-closest["time_diff_hr"] / timing_scale_hours)

    window = track[track["dist_km"] < proximity_scale_km * 2]
    if len(window) >= 2:
        speed_std = window["SOG"].std()
        speed_drop = window["SOG"].max() - window["SOG"].min()
        speed_anomaly_score = min(speed_drop / 10.0, 1.0)
    else:
        speed_anomaly_score = 0.0

    if len(window) >= 2:
        course_std = window["COG"].std()
        course_anomaly_score = min(course_std / 45.0, 1.0)
    else:
        course_anomaly_score = 0.0

    combined = (
        0.40 * proximity_score +
        0.35 * timing_score +
        0.15 * speed_anomaly_score +
        0.10 * course_anomaly_score
    )

    return {
        "MMSI": track["MMSI"].iloc[0],
        "closest_dist_km": round(closest["dist_km"], 2),
        "closest_time_diff_hr": round(closest["time_diff_hr"], 2),
        "proximity_score": round(proximity_score, 3),
        "timing_score": round(timing_score, 3),
        "speed_anomaly_score": round(speed_anomaly_score, 3),
        "course_anomaly_score": round(course_anomaly_score, 3),
        "suspect_score": round(combined, 3),
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ais", type=str, required=True)
    ap.add_argument("--spill_lat", type=float, required=True)
    ap.add_argument("--spill_lon", type=float, required=True)
    ap.add_argument("--spill_time", type=str, required=True)
    ap.add_argument("--top_k", type=int, default=10)
    ap.add_argument("--proximity_scale_km", type=float, default=10.0,
                     help="Distance (km) at which proximity score decays to ~37%")
    ap.add_argument("--timing_scale_hours", type=float, default=6.0,
                     help="Time gap (hours) at which timing score decays to ~37%")
    args = ap.parse_args()

    spill_time = datetime.strptime(args.spill_time, "%Y-%m-%d %H:%M:%S")
    df = pd.read_csv(args.ais)

    results = []
    for mmsi, track in df.groupby("MMSI"):
        results.append(score_vessel_track(
            track, args.spill_lat, args.spill_lon, spill_time,
            proximity_scale_km=args.proximity_scale_km,
            timing_scale_hours=args.timing_scale_hours,
        ))

    results_df = pd.DataFrame(results).sort_values("suspect_score", ascending=False)
    results_df.to_csv("vessel_scores.csv", index=False)

    print(f"Scored {len(results_df)} vessels\n")
    print(f"Top {args.top_k} suspect vessels:\n")
    print(results_df.head(args.top_k).to_string(index=False))
    print(f"\nFull results saved to: vessel_scores.csv")

if __name__ == "__main__":
    main()
