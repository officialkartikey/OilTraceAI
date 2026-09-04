from bson import ObjectId
from app.core.db import get_database
import logging

logger = logging.getLogger(__name__)

class UserRepository:
    def __init__(self):
        self.collection_name = "users"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def get_by_email(self, email: str):
        return await self.collection.find_one({"email": email})

    async def create_user(self, user_data: dict):
        result = await self.collection.insert_one(user_data)
        return str(result.inserted_id)
