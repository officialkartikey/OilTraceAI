import asyncio
import os
import sys
from datetime import datetime, timedelta
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import connect_to_mongo, close_mongo_connection, get_database
from app.repositories.vessel_repository import VesselRepository

async def seed_deterministic_ais():
    print("Starting AIS seeding...")
    await connect_to_mongo()
    repo = VesselRepository()
    
    count_v1001 = await repo.collection.count_documents({"vessel_id": "V-1001"})
    count_v1002 = await repo.collection.count_documents({"vessel_id": "V-1002"})
    if count_v1001 > 0 and count_v1002 > 0:
        print(f"AIS demo data already seeded for V-1001 and V-1002. Skipping seed.")
        await close_mongo_connection()
        return

    print("Seeding deterministic AIS scenario for 01 JAN 2025...")
    await repo.create_indexes()
    
    # Base time is 01 JAN 2025 10:30 UTC
    from datetime import timezone
    base_time = datetime(2025, 1, 1, 10, 30, 0, tzinfo=timezone.utc)
    records = []

    # 1. Strong Candidate (Oceanic Pride)
    # Passes directly through 19.05, 72.85 at T-60 mins (09:30 UTC)
    for i in range(-120, 35, 5): # every 5 mins
        t = base_time + timedelta(minutes=i)
        # Moving eastwards
        lon = 72.75 + (i + 120) * 0.001
        lat = 19.05 + math.sin(i / 20) * 0.01
        records.append({
            "vessel_id": "V-1001",
            "name": "Oceanic Pride",
            "mmsi": "123456789",
            "imo": "IMO9123456",
            "vessel_type": "Oil Tanker",
            "timestamp": t,
            "location": {"type": "Point", "coordinates": [lon, lat]},
            "speed": 12.5,
            "heading": 90,
            "course": 90
        })

    # 2. Weak temporal candidate (Sea Voyager)
    for i in range(-120, 35, 5):
        t = base_time + timedelta(minutes=i)
        lon = 72.85 + (i + 10) * 0.002
        lat = 19.05 - (i + 10) * 0.001
        records.append({
            "vessel_id": "V-1002",
            "name": "Sea Voyager",
            "mmsi": "987654321",
            "imo": "IMO8987654",
            "vessel_type": "Cargo",
            "timestamp": t,
            "location": {"type": "Point", "coordinates": [lon, lat]},
            "speed": 14.2,
            "heading": 135,
            "course": 135
        })

    await repo.collection.insert_many(records)
    print(f"Seeded {len(records)} AIS records.")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_deterministic_ais())
