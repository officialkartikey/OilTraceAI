from bson import ObjectId
from app.core.db import get_database
from app.schemas.vessel import AisRecord, VesselTrack, AisPosition
from datetime import datetime, timedelta
import logging
from app.core.gis import bounding_box_around_point, geometry_centroid

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

    async def find_candidates(self, source_region: dict, start_time: datetime, end_time: datetime, buffer_hours: int = 3, search_radius_km: float = 330.0) -> list[VesselTrack]:
        """
        Query AIS positions intersecting source region during the release window.
        Then fetch a wider trajectory for matching candidates to enable honest attribution scoring.
        """
        # 1. Identify candidate vessel_ids
        # Use a kilometer-based coarse filter so the search radius is consistent
        # across the full Arabian Sea latitude range.
        centroid = geometry_centroid(source_region)
        if centroid:
            center_lon, center_lat = centroid
            search_region = bounding_box_around_point(
                lat=center_lat,
                lon=center_lon,
                radius_km=search_radius_km,
            )
        else:
            search_region = source_region

        initial_query = {
            "timestamp": {"$gte": start_time, "$lte": end_time},
            "location": {
                "$geoIntersects": {
                    "$geometry": search_region
                }
            }
        }
        
        cursor = self.collection.find(initial_query, {"vessel_id": 1})
        candidate_ids = set()
        async for doc in cursor:
            candidate_ids.add(doc["vessel_id"])
            
        if not candidate_ids:
            return []
            
        logger.info(f"Found {len(candidate_ids)} candidate vessels. Fetching wider trajectories...")
        
        # 2. Fetch wider trajectory for these vessels
        wide_start = start_time - timedelta(hours=buffer_hours)
        wide_end = end_time + timedelta(hours=buffer_hours)
        
        full_query = {
            "vessel_id": {"$in": list(candidate_ids)},
            "timestamp": {"$gte": wide_start, "$lte": wide_end}
        }
        
        full_cursor = self.collection.find(full_query)
        records = []
        async for doc in full_cursor:
            doc["_id"] = str(doc["_id"])
            records.append(AisRecord(**doc))

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

        return list(tracks.values())
