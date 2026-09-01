import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import connect_to_mongo, close_mongo_connection
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.observation_repository import ObservationRepository
from app.schemas.investigation import InvestigationCreate
from app.schemas.observation import ObservationCreate
from datetime import datetime

async def seed_investigation():
    print("Starting investigation seed...")
    await connect_to_mongo()
    
    inv_repo = InvestigationRepository()
    obs_repo = ObservationRepository()
    
    # Check if a demo investigation exists
    count = await inv_repo.collection.count_documents({})
    if count > 0:
        print("Investigations already exist. Skipping seed.")
        await close_mongo_connection()
        return
        
    inv = await inv_repo.create(InvestigationCreate())
    print(f"Created Investigation: {inv.id}")
    
    obs_time = datetime(2025, 1, 1, 10, 30, 0)
    obs = await obs_repo.create(ObservationCreate(
        timestamp=obs_time,
        sensor="SAR",
        resolution_m=10.0,
        image_reference="demo_sar_image.png",
        geospatial_bounds={"type": "Polygon", "coordinates": [[[72.7, 18.9], [73.0, 18.9], [73.0, 19.2], [72.7, 19.2], [72.7, 18.9]]]}
    ), inv.id)
    
    await inv_repo.update(inv.id, {"observation_ids": [obs.id]})
    print(f"Added observation: {obs.id}")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_investigation())
