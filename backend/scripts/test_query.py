import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.db import connect_to_mongo, close_mongo_connection
from app.repositories.vessel_repository import VesselRepository

async def run_query():
    await connect_to_mongo()
    v = VesselRepository()
    count = await v.collection.count_documents({})
    print(f"Total vessel records: {count}")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_query())
