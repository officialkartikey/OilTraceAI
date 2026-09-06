from bson import ObjectId
from app.core.db import get_database
from app.schemas.vessel import AisRecord, VesselTrack, AisPosition
from app.engines.spatial_engine import spatial_engine
from datetime import datetime, timedelta, timezone
import math
import logging

logger = logging.getLogger(__name__)

class VesselRepository:
    def __init__(self):
        self.collection_name = "ais_records"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create_indexes(self):
        logger.info("Creating AIS indexes...")
        await self.collection.create_index([("location", "2dsphere")])
        await self.collection.create_index([("timestamp", 1)])
        await self.collection.create_index([("vessel_id", 1), ("timestamp", 1)])
        logger.info("AIS indexes created.")

    def _expand_geometry(self, geometry: dict, buffer_km: float = 25.0) -> dict:
        """
        Buffer a GeoJSON geometry by buffer_km to account for drift uncertainty and discrete AIS pings.
        Builds a valid GeoJSON Polygon with counter-clockwise coordinates [lon, lat].
        """
        if not geometry or "coordinates" not in geometry:
            return geometry

        pts = spatial_engine.extract_coordinates(geometry)
        if not pts:
            return geometry

        lons = [c[0] for c in pts]
        lats = [c[1] for c in pts]
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        mid_lat = (min_lat + max_lat) / 2.0

        # Convert buffer_km to degrees (approx 111.32 km per degree latitude)
        lat_deg = buffer_km / 111.32
        cos_lat = max(0.01, math.cos(math.radians(mid_lat)))
        lon_deg = buffer_km / (111.32 * cos_lat)

        # Counter-clockwise ring: SW -> SE -> NE -> NW -> SW (GeoJSON is [lon, lat])
        return {
            "type": "Polygon",
            "coordinates": [[
                [min_lon - lon_deg, min_lat - lat_deg],
                [max_lon + lon_deg, min_lat - lat_deg],
                [max_lon + lon_deg, max_lat + lat_deg],
                [min_lon - lon_deg, max_lat + lat_deg],
                [min_lon - lon_deg, min_lat - lat_deg]
            ]]
        }

    async def find_candidates(
        self, 
        source_region: dict, 
        start_time: datetime, 
        end_time: datetime, 
        buffer_hours: int = 3,
        spatial_buffer_km: float = 25.0
    ) -> list[VesselTrack]:
        """
        Query AIS positions intersecting source region during the release window.
        Uses spatial buffer and temporal buffer to capture vessels near the release window,
        then fetches a wider trajectory for matching candidates to enable honest attribution scoring.
        """
        if not source_region or "coordinates" not in source_region:
            logger.warning("[ATTRIBUTION] No valid source_region provided to find_candidates.")
            return []

        # Normalize timestamps to naive UTC
        if start_time.tzinfo is not None:
            start_time = start_time.astimezone(timezone.utc).replace(tzinfo=None)
        if end_time.tzinfo is not None:
            end_time = end_time.astimezone(timezone.utc).replace(tzinfo=None)

        # 1. Identify candidate vessel_ids using temporal and spatial search area
        search_start = start_time - timedelta(hours=buffer_hours)
        search_end = end_time + timedelta(hours=buffer_hours)
        search_geometry = self._expand_geometry(source_region, buffer_km=spatial_buffer_km)

        # Extract bounds for diagnostic logging
        pts = spatial_engine.extract_coordinates(search_geometry)
        lons = [p[0] for p in pts]
        lats = [p[1] for p in pts]
        logger.info(
            f"[ATTRIBUTION] AIS search params: time=[{search_start} to {search_end}], "
            f"lon=[{min(lons):.4f}, {max(lons):.4f}], lat=[{min(lats):.4f}, {max(lats):.4f}], "
            f"spatial_buffer_km={spatial_buffer_km}"
        )

        initial_query = {
            "timestamp": {"$gte": search_start, "$lte": search_end},
            "location": {
                "$geoIntersects": {
                    "$geometry": search_geometry
                }
            }
        }
        
        cursor = self.collection.find(initial_query, {"vessel_id": 1})
        candidate_ids = set()
        ais_matches_count = 0
        async for doc in cursor:
            ais_matches_count += 1
            candidate_ids.add(doc["vessel_id"])
            
        logger.info(
            f"[ATTRIBUTION] AIS query returned {ais_matches_count} matching records for "
            f"{len(candidate_ids)} unique vessels: {list(candidate_ids)}"
        )
        if not candidate_ids:
            return []
            
        # 2. Fetch wider trajectory for these vessels
        wide_start = start_time - timedelta(hours=buffer_hours * 2)
        wide_end = end_time + timedelta(hours=buffer_hours * 2)
        
        full_query = {
            "vessel_id": {"$in": list(candidate_ids)},
            "timestamp": {"$gte": wide_start, "$lte": wide_end}
        }
        
        full_cursor = self.collection.find(full_query)
        records = []
        async for doc in full_cursor:
            doc["_id"] = str(doc["_id"])
            records.append(AisRecord(**doc))

        logger.info(f"[ATTRIBUTION] Fetched {len(records)} trajectory points across candidate vessels")

        # Group by vessel_id
        tracks = {}
        for r in records:
            if r.vessel_id not in tracks:
                tracks[r.vessel_id] = VesselTrack(
                    vessel_id=r.vessel_id,
                    mmsi=r.mmsi,
                    imo=r.imo,
                    name=r.name,
                    vessel_type=r.vessel_type,
                    positions=[]
                )
            
            tracks[r.vessel_id].positions.append(
                AisPosition(
                    timestamp=r.timestamp, 
                    location=r.location, 
                    speed=r.speed, 
                    heading=r.heading, 
                    course=r.course
                )
            )

        # Sort positions chronologically
        for track in tracks.values():
            track.positions.sort(key=lambda p: p.timestamp)

        logger.info(f"[ATTRIBUTION] Candidate generation complete: {len(tracks)} tracks prepared")
        return list(tracks.values())
