from bson import ObjectId
from app.core.db import get_database
from app.schemas.reconstruction import Reconstruction, ReconstructionCreate
from datetime import datetime

class ReconstructionRepository:
    def __init__(self):
        self.collection_name = "reconstructions"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, rec_in: ReconstructionCreate) -> Reconstruction:
        doc = rec_in.model_dump()
        doc["created_at"] = datetime.utcnow()
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return Reconstruction(**doc)

    async def get(self, id: str) -> Reconstruction:
        doc = await self.collection.find_one({"_id": ObjectId(id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            return Reconstruction(**doc)
        return None

    async def get_by_investigation(self, investigation_id: str) -> Reconstruction:
        doc = await self.collection.find_one({"investigation_id": investigation_id})
        if doc:
            doc["_id"] = str(doc["_id"])
            return Reconstruction(**doc)
        return None
