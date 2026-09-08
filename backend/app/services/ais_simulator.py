"""
Adaptive AIS simulator.

Real historic AIS coverage is patchy: public bulk feeds (e.g. NOAA / Marine
Cadastre) only cover US waters, and incident-correlated AIS for a specific
spill is almost never public. That means a demo or a live investigation can
easily land on a region/time window for which the database holds no vessel
traffic at all -- in which case attribution silently returns zero candidates
and the pipeline looks broken even though every stage worked correctly.

This service closes that gap. When no real AIS records intersect the
reconstructed source region, it synthesises a plausible traffic picture
*around that specific region and release window* (rather than around a
hardcoded location), so attribution always has something to reason over.
Every generated record is tagged `synthetic: True` and carries a
`data_source` marker so the UI, the API response and the PDF report can be
explicit that this traffic is simulated, never passing it off as real.
"""

import logging
import math
import random
from datetime import datetime, timedelta
from typing import Optional

from app.engines.spatial_engine import spatial_engine

logger = logging.getLogger(__name__)

# A small, fixed roster so repeat runs are recognisable in the UI.
SIMULATED_VESSELS = [
    {"vessel_id": "SIM-9001", "name": "Simulated Tanker Alpha", "mmsi": "999000001",
     "imo": "IMO9990001", "vessel_type": "Tanker"},
    {"vessel_id": "SIM-9002", "name": "Simulated Cargo Bravo", "mmsi": "999000002",
     "imo": "IMO9990002", "vessel_type": "Cargo"},
    {"vessel_id": "SIM-9003", "name": "Simulated Fishing Charlie", "mmsi": "999000003",
     "imo": "IMO9990003", "vessel_type": "Fishing"},
    {"vessel_id": "SIM-9004", "name": "Simulated Tanker Delta", "mmsi": "999000004",
     "imo": "IMO9990004", "vessel_type": "Tanker"},
    {"vessel_id": "SIM-9005", "name": "Simulated Cargo Echo", "mmsi": "999000005",
     "imo": "IMO9990005", "vessel_type": "Cargo"},
]

KM_PER_DEG_LAT = 111.32


class AisSimulator:
    def __init__(self):
        self.collection_name = "ais_records"

    @property
    def collection(self):
        from app.core.db import get_database
        return get_database()[self.collection_name]

    def _region_centroid(self, source_region: dict) -> Optional[tuple[float, float]]:
        """Return (lat, lon) centre of a GeoJSON geometry, or None if unusable."""
        pts = spatial_engine.extract_coordinates(source_region) if source_region else []
        if not pts:
            return None
        lons = [c[0] for c in pts]
        lats = [c[1] for c in pts]
        return (sum(lats) / len(lats), sum(lons) / len(lons))

    def _km_to_deg(self, km: float, at_lat: float) -> tuple[float, float]:
        """Convert a km offset into (lat_deg, lon_deg) at the given latitude."""
        lat_deg = km / KM_PER_DEG_LAT
        cos_lat = max(0.01, math.cos(math.radians(at_lat)))
        lon_deg = km / (KM_PER_DEG_LAT * cos_lat)
        return lat_deg, lon_deg

    def _generate_track(
        self,
        vessel: dict,
        centre_lat: float,
        centre_lon: float,
        window_start: datetime,
        window_end: datetime,
        is_suspect: bool,
        ping_interval_minutes: int = 15,
    ) -> list[dict]:
        """
        Build one vessel's AIS track.

        Suspects are routed so that they pass within a few km of the source
        region during the release window, with a speed drop and course wobble
        near the closest approach (the behavioural signature of an operational
        discharge). Background vessels are placed further out and/or offset in
        time so the attribution engine has genuine negatives to rank against.
        """
        track_start = window_start - timedelta(hours=6)
        track_end = window_end + timedelta(hours=6)
        total_minutes = max(60, int((track_end - track_start).total_seconds() / 60))
        steps = max(8, total_minutes // ping_interval_minutes)

        if is_suspect:
            # Start 15-40 km out, aim to pass 1-5 km from the source region.
            start_offset_km = random.uniform(15, 40)
            pass_offset_km = random.uniform(1, 5)
        else:
            # Background traffic stays 40-150 km away.
            start_offset_km = random.uniform(60, 150)
            pass_offset_km = random.uniform(40, 120)

        start_bearing = random.uniform(0, 360)
        pass_bearing = random.uniform(0, 360)

        lat_off, lon_off = self._km_to_deg(start_offset_km, centre_lat)
        start_lat = centre_lat + lat_off * math.cos(math.radians(start_bearing))
        start_lon = centre_lon + lon_off * math.sin(math.radians(start_bearing))

        lat_off, lon_off = self._km_to_deg(pass_offset_km, centre_lat)
        pass_lat = centre_lat + lat_off * math.cos(math.radians(pass_bearing))
        pass_lon = centre_lon + lon_off * math.sin(math.radians(pass_bearing))

        # Continue past the closest-approach point on the same heading.
        end_lat = pass_lat + (pass_lat - start_lat)
        end_lon = pass_lon + (pass_lon - start_lon)

        # The closest approach lands in the middle of the release window.
        window_mid = window_start + (window_end - window_start) / 2
        mid_step = int(steps * ((window_mid - track_start).total_seconds()
                                 / max(1.0, (track_end - track_start).total_seconds())))
        mid_step = min(max(mid_step, 1), steps - 1)

        base_speed = random.uniform(9.0, 17.0)
        records = []

        for step in range(steps + 1):
            if step <= mid_step:
                frac = step / mid_step if mid_step else 1.0
                lat = start_lat + (pass_lat - start_lat) * frac
                lon = start_lon + (pass_lon - start_lon) * frac
            else:
                frac = (step - mid_step) / max(1, (steps - mid_step))
                lat = pass_lat + (end_lat - pass_lat) * frac
                lon = pass_lon + (end_lon - pass_lon) * frac

            heading = (math.degrees(math.atan2(end_lon - start_lon,
                                                 end_lat - start_lat)) + 360) % 360

            speed = base_speed + random.uniform(-0.6, 0.6)
            # Behavioural anomaly for suspects: slow down and wobble on approach.
            near_closest_approach = abs(step - mid_step) <= 2
            if is_suspect and near_closest_approach:
                speed = base_speed * random.uniform(0.2, 0.4)
                heading = (heading + random.uniform(-50, 50)) % 360
            else:
                heading = (heading + random.uniform(-3, 3)) % 360

            timestamp = track_start + timedelta(minutes=step * ping_interval_minutes)

            records.append({
                "vessel_id": vessel["vessel_id"],
                "name": vessel["name"],
                "mmsi": vessel["mmsi"],
                "imo": vessel["imo"],
                "vessel_type": vessel["vessel_type"],
                "timestamp": timestamp,
                "location": {"type": "Point", "coordinates": [lon, lat]},
                "speed": round(speed, 2),
                "heading": round(heading, 1),
                "course": round(heading, 1),
                # Provenance markers -- never let simulated traffic masquerade as real.
                "synthetic": True,
                "data_source": "simulated",
            })

        return records

    async def generate_for_region(
        self,
        source_region: dict,
        window_start: datetime,
        window_end: datetime,
        n_suspects: int = 2,
        n_background: int = 3,
        persist: bool = True,
    ) -> int:
        """
        Generate synthetic AIS traffic centred on `source_region` during the
        given release window. Returns the number of records generated.
        """
        centroid = self._region_centroid(source_region)
        if centroid is None:
            logger.warning("[AIS-SIM] Cannot simulate: source_region has no usable coordinates.")
            return 0

        centre_lat, centre_lon = centroid
        logger.info(
            f"[AIS-SIM] Generating synthetic traffic around "
            f"lat={centre_lat:.4f}, lon={centre_lon:.4f} for window "
            f"[{window_start} to {window_end}]"
        )

        roster = SIMULATED_VESSELS[: n_suspects + n_background]
        all_records = []
        for idx, vessel in enumerate(roster):
            all_records.extend(
                self._generate_track(
                    vessel=vessel,
                    centre_lat=centre_lat,
                    centre_lon=centre_lon,
                    window_start=window_start,
                    window_end=window_end,
                    is_suspect=(idx < n_suspects),
                )
            )

        if persist and all_records:
            await self.collection.insert_many(all_records)

        logger.info(
            f"[AIS-SIM] Generated {len(all_records)} synthetic records across "
            f"{len(roster)} vessels ({n_suspects} suspect, {n_background} background)."
        )
        return len(all_records)

    async def clear_simulated(self) -> int:
        """Remove all previously simulated records (keeps real AIS untouched)."""
        result = await self.collection.delete_many({"synthetic": True})
        logger.info(f"[AIS-SIM] Cleared {result.deleted_count} simulated AIS records.")
        return result.deleted_count


ais_simulator = AisSimulator()