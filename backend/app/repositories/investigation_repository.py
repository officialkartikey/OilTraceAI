from bson import ObjectId
from app.core.db import get_database
from app.schemas.investigation import Investigation, InvestigationCreate
from datetime import datetime

class InvestigationRepository:
    def __init__(self):
        self.collection_name = "investigations"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, inv_in: InvestigationCreate) -> Investigation:
        doc = inv_in.model_dump()
        doc["created_at"] = datetime.utcnow()
        doc["updated_at"] = datetime.utcnow()
        doc["status"] = "CREATED"
        doc["observation_ids"] = []
        doc["candidate_ids"] = []
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return Investigation(**doc)

    async def get(self, id: str) -> Investigation:
        doc = await self.collection.find_one({"_id": ObjectId(id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            return Investigation(**doc)
        return None

    async def update(self, id: str, update_data: dict) -> Investigation:
        update_data["updated_at"] = datetime.utcnow()
        await self.collection.update_one({"_id": ObjectId(id)}, {"$set": update_data})
        return await self.get(id)
