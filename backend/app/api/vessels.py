from fastapi import APIRouter
from app.repositories.vessel_repository import VesselRepository

router = APIRouter(prefix="/vessels", tags=["vessels"])
vessel_repo = VesselRepository()

@router.get("/")
async def list_vessels():
    # Just list some distinct vessels for the prototype
    cursor = vessel_repo.collection.aggregate([
        {
            "$group": {
                "_id": "$vessel_id",
                "name": {"$first": "$name"},
                "mmsi": {"$first": "$mmsi"},
                "imo": {"$first": "$imo"},
                "vessel_type": {"$first": "$vessel_type"}
            }
        },
        {"$limit": 100}
    ])
    
    results = []
    async for doc in cursor:
        doc["vessel_id"] = doc.pop("_id")
        results.append(doc)
        
    return results

@router.get("/{mmsi}")
async def get_vessel(mmsi: str):
    cursor = vessel_repo.collection.find({"mmsi": mmsi}).sort("timestamp", -1).limit(100)
    records = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        records.append(doc)
    
    return {"mmsi": mmsi, "track": records}
