"""
Fetches real ocean current and wind data for a given lat/lon using the
free Open-Meteo Marine + Weather APIs (no API key required).

This replaces manually-guessed --current_speed/--wind_speed values in
drift_model.py with real forecast/current data.

APIs used:
  - Marine API: https://marine-api.open-meteo.com/v1/marine
      -> ocean_current_velocity (km/h), ocean_current_direction (degrees)
  - Weather API: https://api.open-meteo.com/v1/forecast
      -> wind_speed_10m (km/h), wind_direction_10m (degrees)

Usage:
    python fetch_ocean_data.py --lat 19.05 --lon 72.85 --time "2026-01-15T08:00"
"""

import argparse
import sys
from datetime import datetime

import requests

MARINE_API = "https://marine-api.open-meteo.com/v1/marine"
WEATHER_API = "https://api.open-meteo.com/v1/forecast"


def fetch_marine_current(lat, lon, target_time_iso):
    """Returns (current_speed_kn, current_dir_deg) at the closest available hour."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "ocean_current_velocity,ocean_current_direction",
        "timezone": "UTC",
    }
    resp = requests.get(MARINE_API, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    times = data["hourly"]["time"]
    speeds_kmh = data["hourly"]["ocean_current_velocity"]
    dirs = data["hourly"]["ocean_current_direction"]

    idx = _closest_time_index(times, target_time_iso)
    speed_kn = speeds_kmh[idx] / 1.852  # km/h -> knots
    return speed_kn, dirs[idx]


def fetch_wind(lat, lon, target_time_iso):
    """Returns (wind_speed_kn, wind_dir_deg) at the closest available hour."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wind_speed_10m,wind_direction_10m",
        "wind_speed_unit": "kn",
        "timezone": "UTC",
    }
    resp = requests.get(WEATHER_API, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    times = data["hourly"]["time"]
    speeds = data["hourly"]["wind_speed_10m"]
    dirs = data["hourly"]["wind_direction_10m"]

    idx = _closest_time_index(times, target_time_iso)
    return speeds[idx], dirs[idx]


def _closest_time_index(time_list, target_time_iso):
    """Find the index of the hourly timestamp closest to target_time_iso."""
    target = datetime.fromisoformat(target_time_iso)
    parsed = [datetime.fromisoformat(t) for t in time_list]
    diffs = [abs((t - target).total_seconds()) for t in parsed]
    return diffs.index(min(diffs))


def get_environmental_conditions(lat, lon, time_iso):
    """
    Convenience function: returns a dict with current + wind data,
    ready to feed into drift_model.py's compute_drift_velocity().

    NOTE: Open-Meteo's forecast APIs only cover recent past + future dates
    (rolling window). For historical spill dates far in the past, this will
    fail -- in that case fall back to climatological defaults or another
    historical data source.
    """
    try:
        current_speed_kn, current_dir = fetch_marine_current(lat, lon, time_iso)
    except Exception as e:
        print(f"  Warning: could not fetch marine current data ({e}); using default 0.5 kn", file=sys.stderr)
        current_speed_kn, current_dir = 0.5, 45.0

    try:
        wind_speed_kn, wind_dir = fetch_wind(lat, lon, time_iso)
    except Exception as e:
        print(f"  Warning: could not fetch wind data ({e}); using default 10 kn", file=sys.stderr)
        wind_speed_kn, wind_dir = 10.0, 90.0

    return {
        "current_speed_kn": round(current_speed_kn, 2),
        "current_dir_deg": round(current_dir, 1),
        "wind_speed_kn": round(wind_speed_kn, 2),
        "wind_dir_deg": round(wind_dir, 1),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--time", type=str, required=True, help="ISO format, e.g. 2026-01-15T08:00")
    args = ap.parse_args()

    conditions = get_environmental_conditions(args.lat, args.lon, args.time)
    print("=== Fetched environmental conditions ===")
    for k, v in conditions.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
