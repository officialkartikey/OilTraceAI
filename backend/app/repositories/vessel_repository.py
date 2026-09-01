from bson import ObjectId
from app.core.db import get_database
from app.schemas.vessel import AisRecord, VesselTrack, AisPosition
from datetime import datetime
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

    async def find_candidates(self, source_region: dict, start_time: datetime, end_time: datetime) -> list[VesselTrack]:
        """
        Query AIS positions inside/near source region within release window.
        Returns grouped trajectories.
        """
        query = {
            "timestamp": {"$gte": start_time, "$lte": end_time},
            "location": {
                "$geoIntersects": {
                    "$geometry": source_region
                }
            }
        }
        
        cursor = self.collection.find(query)
        records = []
        async for doc in cursor:
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
