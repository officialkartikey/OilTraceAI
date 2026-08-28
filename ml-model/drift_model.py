"""
Phase 2: Simplified physics-based oil spill drift (hindcast + forecast) model.

Real oceanographic drift modeling (e.g. using OpenDrift, GNOME) involves
complex ocean-current and wind-field simulations. For this prototype, we use
a simplified but scientifically-grounded approach widely used as a first
approximation in spill response:

    drift_velocity = current_velocity + (wind_drift_factor * wind_velocity)

This is the standard "leeway" model used in real oil-spill response
(wind_drift_factor is typically 3-4% of wind speed, a well-established
empirical constant from Coast Guard search-and-rescue and spill-response
literature).

CAPABILITIES:
  1. HINDCAST (backward): given the detected spill location/time, estimate
     where and when the spill likely originated.
  2. FORECAST (forward): given the detected spill location/time, predict
     where the slick will drift to over the next N hours.

In production this would pull real current/wind data (e.g. from NOAA,
Copernicus Marine, or INCOIS for Indian waters). Here we accept them as
inputs (or use reasonable defaults) so the algorithm can be demonstrated
without requiring a live data feed.

Usage:
    python drift_model.py \
        --spill_lat 19.05 --spill_lon 72.85 \
        --spill_time "2026-01-15 08:00:00" \
        --current_speed 0.5 --current_dir 45 \
        --wind_speed 15 --wind_dir 90 \
        --hindcast_hours 6 --forecast_hours 12
"""

import argparse
from datetime import datetime, timedelta

import numpy as np

try:
    from fetch_ocean_data import get_environmental_conditions
    _HAS_FETCHER = True
except ImportError:
    _HAS_FETCHER = False

WIND_DRIFT_FACTOR = 0.035  # ~3.5% of wind speed, standard leeway approximation
EARTH_RADIUS_KM = 6371.0


def deg_to_vector(speed, direction_deg):
    """Convert speed + compass direction (0=N, 90=E) into (dx, dy) in km/h-equivalent units."""
    rad = np.radians(direction_deg)
    dx = speed * np.sin(rad)  # eastward component
    dy = speed * np.cos(rad)  # northward component
    return dx, dy


def offset_position(lat, lon, dx_km, dy_km):
    """Offset a lat/lon by dx (east, km) and dy (north, km)."""
    dlat = dy_km / 111.0  # ~111 km per degree latitude
    dlon = dx_km / (111.0 * np.cos(np.radians(lat)))
    return lat + dlat, lon + dlon


def compute_drift_velocity(current_speed_kmh, current_dir_deg, wind_speed_kmh, wind_dir_deg):
    """Combined drift = ocean current + wind-driven leeway component."""
    cx, cy = deg_to_vector(current_speed_kmh, current_dir_deg)
    wx, wy = deg_to_vector(wind_speed_kmh * WIND_DRIFT_FACTOR, wind_dir_deg)
    return cx + wx, cy + wy


def simulate_track(start_lat, start_lon, start_time, dx_kmh, dy_kmh,
                    duration_hours, timestep_hours=1.0, reverse=False):
    """
    Step the position forward (or backward, if reverse=True) in time using
    the constant drift velocity. Returns a list of (time, lat, lon) points.
    """
    sign = -1 if reverse else 1
    n_steps = int(duration_hours / timestep_hours)

    lat, lon = start_lat, start_lon
    t = start_time
    track = [(t, lat, lon)]

    for _ in range(n_steps):
        lat, lon = offset_position(lat, lon, sign * dx_kmh * timestep_hours, sign * dy_kmh * timestep_hours)
        t = t + timedelta(hours=sign * timestep_hours)
        track.append((t, lat, lon))

    if reverse:
        track = track[::-1]  # chronological order for hindcast too

    return track


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spill_lat", type=float, required=True)
    ap.add_argument("--spill_lon", type=float, required=True)
    ap.add_argument("--spill_time", type=str, required=True, help="Format: 'YYYY-MM-DD HH:MM:SS'")
    ap.add_argument("--current_speed", type=float, default=None, help="Ocean current speed (knots). If omitted, fetched automatically.")
    ap.add_argument("--current_dir", type=float, default=None, help="Current direction, degrees (0=N, 90=E). If omitted, fetched automatically.")
    ap.add_argument("--wind_speed", type=float, default=None, help="Wind speed (knots). If omitted, fetched automatically.")
    ap.add_argument("--wind_dir", type=float, default=None, help="Wind direction, degrees (0=N, 90=E). If omitted, fetched automatically.")
    ap.add_argument("--auto_fetch", action="store_true", help="Fetch real current/wind data from Open-Meteo instead of using manual values")
    ap.add_argument("--hindcast_hours", type=float, default=6, help="How far back to trace origin")
    ap.add_argument("--forecast_hours", type=float, default=12, help="How far forward to predict drift")
    ap.add_argument("--timestep_hours", type=float, default=1.0)
    args = ap.parse_args()

    spill_time = datetime.strptime(args.spill_time, "%Y-%m-%d %H:%M:%S")

    # Determine current/wind values: auto-fetch if requested (or if any value
    # is missing), otherwise use the manually-provided ones.
    need_fetch = args.auto_fetch or None in (args.current_speed, args.current_dir, args.wind_speed, args.wind_dir)

    if need_fetch:
        if not _HAS_FETCHER:
            raise RuntimeError(
                "Auto-fetch requested but fetch_ocean_data.py not found in the same folder, "
                "and manual --current_speed/--current_dir/--wind_speed/--wind_dir were not fully provided."
            )
        print("Fetching real ocean current + wind data from Open-Meteo...")
        conditions = get_environmental_conditions(
            args.spill_lat, args.spill_lon, spill_time.strftime("%Y-%m-%dT%H:%M")
        )
        current_speed = args.current_speed if args.current_speed is not None else conditions["current_speed_kn"]
        current_dir = args.current_dir if args.current_dir is not None else conditions["current_dir_deg"]
        wind_speed = args.wind_speed if args.wind_speed is not None else conditions["wind_speed_kn"]
        wind_dir = args.wind_dir if args.wind_dir is not None else conditions["wind_dir_deg"]
    else:
        current_speed, current_dir = args.current_speed, args.current_dir
        wind_speed, wind_dir = args.wind_speed, args.wind_dir

    # convert knots to km/h (1 knot = 1.852 km/h)
    current_speed_kmh = current_speed * 1.852
    wind_speed_kmh = wind_speed * 1.852

    dx_kmh, dy_kmh = compute_drift_velocity(
        current_speed_kmh, current_dir, wind_speed_kmh, wind_dir
    )
    drift_speed_kmh = np.sqrt(dx_kmh**2 + dy_kmh**2)

    print(f"=== Drift parameters ===")
    print(f"Ocean current: {current_speed} kn @ {current_dir} deg")
    print(f"Wind: {wind_speed} kn @ {wind_dir} deg (leeway factor: {WIND_DRIFT_FACTOR})")
    print(f"Combined drift speed: {drift_speed_kmh:.3f} km/h ({drift_speed_kmh/1.852:.3f} kn)")

    # --- Hindcast: trace backward to estimate origin ---
    print(f"\n=== HINDCAST: tracing back {args.hindcast_hours}h to estimate origin ===")
    hindcast_track = simulate_track(
        args.spill_lat, args.spill_lon, spill_time, dx_kmh, dy_kmh,
        duration_hours=args.hindcast_hours, timestep_hours=args.timestep_hours, reverse=True
    )
    origin_time, origin_lat, origin_lon = hindcast_track[0]
    print(f"Estimated origin: lat={origin_lat:.5f}, lon={origin_lon:.5f} at {origin_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"\nFull hindcast track:")
    for t, lat, lon in hindcast_track:
        print(f"  {t.strftime('%Y-%m-%d %H:%M')}  lat={lat:.5f}  lon={lon:.5f}")

    # --- Forecast: predict forward drift ---
    print(f"\n=== FORECAST: predicting drift {args.forecast_hours}h forward ===")
    forecast_track = simulate_track(
        args.spill_lat, args.spill_lon, spill_time, dx_kmh, dy_kmh,
        duration_hours=args.forecast_hours, timestep_hours=args.timestep_hours, reverse=False
    )
    print(f"Full forecast track:")
    for t, lat, lon in forecast_track:
        print(f"  {t.strftime('%Y-%m-%d %H:%M')}  lat={lat:.5f}  lon={lon:.5f}")

    final_time, final_lat, final_lon = forecast_track[-1]
    print(f"\nPredicted position after {args.forecast_hours}h: lat={final_lat:.5f}, lon={final_lon:.5f}")

    return {
        "origin": {"lat": origin_lat, "lon": origin_lon, "time": origin_time.isoformat()},
        "hindcast_track": [{"time": t.isoformat(), "lat": lat, "lon": lon} for t, lat, lon in hindcast_track],
        "forecast_track": [{"time": t.isoformat(), "lat": lat, "lon": lon} for t, lat, lon in forecast_track],
    }


if __name__ == "__main__":
    main()
