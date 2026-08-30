from bson import ObjectId
from app.core.db import get_database
from app.schemas.observation import Observation, ObservationCreate
from datetime import datetime

class ObservationRepository:
    def __init__(self):
        self.collection_name = "observations"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, obs_in: ObservationCreate, investigation_id: str) -> Observation:
        doc = obs_in.model_dump()
        doc["investigation_id"] = investigation_id
        doc["created_at"] = datetime.utcnow()
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return Observation(**doc)

    async def get(self, id: str) -> Observation:
        doc = await self.collection.find_one({"_id": ObjectId(id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            return Observation(**doc)
        return None

    async def get_by_investigation(self, investigation_id: str) -> list[Observation]:
        cursor = self.collection.find({"investigation_id": investigation_id})
        observations = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            observations.append(Observation(**doc))
        return observations
