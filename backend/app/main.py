import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.db import connect_to_mongo, close_mongo_connection
from app.api import investigations, vessels, health

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up FastAPI...")
    await connect_to_mongo()
    
    # Check indexes
    from app.repositories.vessel_repository import VesselRepository
    v_repo = VesselRepository()
    await v_repo.create_indexes()
    
    yield
    # Shutdown
    logger.info("Shutting down FastAPI...")
    await close_mongo_connection()

app = FastAPI(title="Kairos Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(investigations.router, prefix="/api/v1/investigations", tags=["investigations"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
