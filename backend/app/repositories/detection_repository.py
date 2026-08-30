from bson import ObjectId
from app.core.db import get_database
from app.schemas.detection import Detection, DetectionCreate
from datetime import datetime

class DetectionRepository:
    def __init__(self):
        self.collection_name = "detections"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, det_in: DetectionCreate) -> Detection:
        doc = det_in.model_dump()
        doc["created_at"] = datetime.utcnow()
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return Detection(**doc)

    async def get(self, id: str) -> Detection:
        doc = await self.collection.find_one({"_id": ObjectId(id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            return Detection(**doc)
        return None

    async def get_by_investigation(self, investigation_id: str) -> Detection:
        doc = await self.collection.find_one({"investigation_id": investigation_id})
        if doc:
            doc["_id"] = str(doc["_id"])
            return Detection(**doc)
        return None
