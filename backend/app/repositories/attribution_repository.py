from app.core.db import get_database
from typing import Dict, Any, Optional
from datetime import datetime
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
            "investigation_id": str(investigation_id),
            "ranked_candidates": ranked_candidates,
            "created_at": datetime.utcnow()
        }
        # Use update_one with upsert=True to support re-analysis without orphan records
        result = await self.collection.update_one(
            {"investigation_id": str(investigation_id)},
            {"$set": doc},
            upsert=True
        )
        if result.upserted_id:
            attr_id = str(result.upserted_id)
        else:
            existing = await self.collection.find_one({"investigation_id": str(investigation_id)}, sort=[("_id", -1)])
            attr_id = str(existing["_id"]) if existing else None
            
        logger.info(f"[ATTRIBUTION] Persisted attribution doc: id={attr_id} for investigation={investigation_id} ({len(ranked_candidates)} candidates)")
        return attr_id
        
    async def get_by_investigation(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        # Match by string or ObjectId representation to avoid ID type mismatch
        query = {
            "$or": [
                {"investigation_id": str(investigation_id)},
                {"investigation_id": ObjectId(investigation_id) if ObjectId.is_valid(investigation_id) else None}
            ]
        }
        doc = await self.collection.find_one(query, sort=[("_id", -1)])
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

attribution_repo = AttributionRepository()

