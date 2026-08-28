
import argparse
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

def generate_vessel_track(mmsi, start_lat, start_lon, start_time, speed_knots,
                           heading_deg, duration_hours, timestep_minutes=10):
    records = []
    lat, lon = start_lat, start_lon
    t = start_time

    speed_deg_per_hour = speed_knots * 1.852 / 111.0
    dlat = speed_deg_per_hour * np.cos(np.radians(heading_deg)) * (timestep_minutes / 60)
    dlon = speed_deg_per_hour * np.sin(np.radians(heading_deg)) * (timestep_minutes / 60)

    n_steps = int((duration_hours * 60) / timestep_minutes)
    for _ in range(n_steps):
        records.append({
            "MMSI": mmsi,
            "BaseDateTime": t.strftime("%Y-%m-%dT%H:%M:%S"),
            "LAT": round(lat, 5),
            "LON": round(lon, 5),
            "SOG": round(speed_knots + random.uniform(-0.5, 0.5), 1),
            "COG": round(heading_deg + random.uniform(-3, 3), 1),
            "VesselType": random.choice([70, 71, 80, 1004, 1024]),
        })
        lat += dlat + random.uniform(-0.0005, 0.0005)
        lon += dlon + random.uniform(-0.0005, 0.0005)
        t += timedelta(minutes=timestep_minutes)

    return records

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=str, default="ais_synthetic.csv")
    ap.add_argument("--spill_lat", type=float, default=19.05)
    ap.add_argument("--spill_lon", type=float, default=72.85)
    ap.add_argument("--spill_time", type=str, default="2026-01-15 08:00:00")
    ap.add_argument("--n_vessels", type=int, default=40)
    ap.add_argument("--n_suspects", type=int, default=5,
                     help="Number of vessels deliberately routed near the spill at spill time")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    spill_time = datetime.strptime(args.spill_time, "%Y-%m-%d %H:%M:%S")
    all_records = []

    for i in range(args.n_suspects):
        mmsi = 200000000 + i
        offset_lat = random.uniform(-0.05, 0.05)
        offset_lon = random.uniform(-0.05, 0.05)
        start_time = spill_time - timedelta(hours=random.uniform(1, 3))
        heading = random.uniform(0, 360)
        speed = random.uniform(8, 18)

        records = generate_vessel_track(
            mmsi=mmsi,
            start_lat=args.spill_lat + offset_lat,
            start_lon=args.spill_lon + offset_lon,
            start_time=start_time,
            speed_knots=speed,
            heading_deg=heading,
            duration_hours=random.uniform(4, 6),
        )
        all_records.extend(records)

    for i in range(args.n_vessels - args.n_suspects):
        mmsi = 300000000 + i
        offset_lat = random.uniform(-2.0, 2.0)
        offset_lon = random.uniform(-2.0, 2.0)
        start_time = spill_time + timedelta(hours=random.uniform(-48, 48))
        heading = random.uniform(0, 360)
        speed = random.uniform(5, 20)

        records = generate_vessel_track(
            mmsi=mmsi,
            start_lat=args.spill_lat + offset_lat,
            start_lon=args.spill_lon + offset_lon,
            start_time=start_time,
            speed_knots=speed,
            heading_deg=heading,
            duration_hours=random.uniform(2, 8),
        )
        all_records.extend(records)

    df = pd.DataFrame(all_records)
    df = df.sort_values(["MMSI", "BaseDateTime"]).reset_index(drop=True)
    df.to_csv(args.out, index=False)

    print(f"Generated {len(df)} AIS pings for {df['MMSI'].nunique()} vessels")
    print(f"  Suspect vessels (near spill): {args.n_suspects}")
    print(f"  Background/irrelevant vessels: {args.n_vessels - args.n_suspects}")
    print(f"Saved to: {args.out}")

if __name__ == "__main__":
    main()
