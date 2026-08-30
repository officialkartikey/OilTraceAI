from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    try:
        db.client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=2000)
        # Attempt to fetch server info to verify connection
        await db.client.server_info()
        logger.info("Connected to MongoDB.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # We don't raise the exception here so the app can still start (though DB operations will fail later)

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db.client:
        db.client.close()
    logger.info("MongoDB connection closed.")

def get_database():
    return db.client[settings.mongodb_database]
