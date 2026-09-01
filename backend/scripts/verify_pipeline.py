import asyncio
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import connect_to_mongo, close_mongo_connection
from app.schemas.investigation import InvestigationCreate
from app.schemas.observation import ObservationCreate
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.observation_repository import ObservationRepository
from app.services.investigation_orchestrator import orchestrator
from app.repositories.attribution_repository import attribution_repo

async def verify():
    await connect_to_mongo()
    inv_repo = InvestigationRepository()
    obs_repo = ObservationRepository()
    
    # Create investigation
    inv = await inv_repo.create(InvestigationCreate())
    print(f"Created Investigation: {inv.id}")
    
    # Create observation
    dummy_bounds = {
        "type": "Polygon",
        "coordinates": [[[72.75, 19.0], [72.85, 19.0], [72.85, 19.1], [72.75, 19.1], [72.75, 19.0]]]
    }
    
    # The time where Oceanic Pride (V-1001) is passing by is ~ 2025-01-01 10:30 UTC.
    obs_in = ObservationCreate(
        timestamp=datetime.fromisoformat("2025-01-01T10:30:00+00:00"),
        sensor="Sentinel-1",
        image_reference="dummy_url",
        geospatial_bounds=dummy_bounds
    )
    obs = await obs_repo.create(obs_in, inv.id)
    print(f"Created Observation: {obs.id}")
    await inv_repo.update(inv.id, {"observation_ids": [obs.id]})
    
    # Run Orchestrator
    print("Running pipeline...")
    await orchestrator.analyze(inv.id)
    
    # Verify final state
    inv_final = await inv_repo.get(inv.id)
    print(f"Final Status: {inv_final.status}")
    if getattr(inv_final, "failure", None):
        print(f"Failure: {inv_final.failure}")
    
    attr_data = await attribution_repo.get_by_investigation(inv.id)
    if attr_data and "ranked_candidates" in attr_data:
        candidates = attr_data["ranked_candidates"]
        print(f"Found {len(candidates)} candidates.")
        for i, c in enumerate(candidates):
            vessel = c["vessel"]
            print(f"  [{i+1}] {vessel['name']} ({vessel['vessel_id']}) - Score: {c['attribution_score']}")
            
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(verify())
