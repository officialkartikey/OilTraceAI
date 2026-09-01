import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import connect_to_mongo, close_mongo_connection
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.attribution_repository import attribution_repo
from app.repositories.detection_repository import DetectionRepository
from app.repositories.reconstruction_repository import ReconstructionRepository

async def test():
    await connect_to_mongo()
    inv_repo = InvestigationRepository()
    inv = await inv_repo.get("6a971a08a2774d810828654a") # ID from task-469
    print("Candidate IDs:", inv.candidate_ids)
    
    det = await DetectionRepository().get_by_investigation(inv.id)
    if det:
        coords = det.geometry["coordinates"][0]
        lons = [c[0] for c in coords]
        print(f"Detection Lon range: {min(lons)} to {max(lons)}")
    
    rec = await ReconstructionRepository().get_by_investigation(inv.id)
    if rec:
        coords = rec.source_region["coordinates"][0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        print(f"Source Region Lon: {min(lons)} to {max(lons)}")
        print(f"Source Region Lat: {min(lats)} to {max(lats)}")
        print(f"Start Time: {rec.release_window.start_time}")
        print(f"End Time: {rec.release_window.end_time}")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test())
