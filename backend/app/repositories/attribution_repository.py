from app.core.db import get_database
from typing import Dict, Any
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class AttributionRepository:
    def __init__(self):
        self.collection_name = "attributions"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, investigation_id: str, ranked_candidates: list[Dict[str, Any]]) -> str:
        doc = {
            "investigation_id": investigation_id,
            "ranked_candidates": ranked_candidates
        }
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)
        
    async def get_by_investigation(self, investigation_id: str) -> Dict[str, Any]:
        doc = await self.collection.find_one({"investigation_id": investigation_id})
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

attribution_repo = AttributionRepository()
