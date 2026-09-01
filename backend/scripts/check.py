import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import connect_to_mongo, close_mongo_connection
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.attribution_repository import attribution_repo

async def test():
    await connect_to_mongo()
    inv_repo = InvestigationRepository()
    inv = await inv_repo.get("6a97193bdb0cf04899a2265d")
    print("candidate_ids:", inv.candidate_ids)
    
    attr = await attribution_repo.get_by_investigation(inv.id)
    if attr:
        print("Ranked Candidates:", len(attr.get("ranked_candidates", [])))
    else:
        print("No attribution record found.")
        
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test())
