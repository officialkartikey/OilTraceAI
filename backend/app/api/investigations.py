from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import Optional, List
from app.schemas.investigation import InvestigationCreate, Investigation
from app.schemas.observation import ObservationCreate, Observation
from app.schemas.fusion import InvestigationResult
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.detection_repository import DetectionRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.vessel_repository import VesselRepository
from app.services.ml_client import ml_client
from app.engines.drift_engine import drift_engine
from app.engines.evidence_engine import evidence_engine
from app.engines.attribution_engine import attribution_engine
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

inv_repo = InvestigationRepository()
obs_repo = ObservationRepository()
det_repo = DetectionRepository()
rec_repo = ReconstructionRepository()
vessel_repo = VesselRepository()

@router.post("/", response_model=Investigation)
async def create_investigation(inv_in: InvestigationCreate):
    return await inv_repo.create(inv_in)

@router.get("/{id}", response_model=Investigation)
async def get_investigation(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

from fastapi import UploadFile, File, Form
import shutil
import os

@router.post("/{id}/observations", response_model=Observation)
async def add_observation(
    id: str, 
    timestamp: str = Form(...),
    sensor: str = Form(...),
    resolution_m: Optional[float] = Form(None),
    file: UploadFile = File(...)
):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    # Save the uploaded file locally for the prototype
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create the observation
    from datetime import datetime
    import json
    
    # Simple polygon bounds around Mumbai for prototype dummy if not provided
    dummy_bounds = {"type": "Polygon", "coordinates": [[[72.7, 18.9], [73.0, 18.9], [73.0, 19.2], [72.7, 19.2], [72.7, 18.9]]]}
    
    obs_in = ObservationCreate(
        timestamp=datetime.fromisoformat(timestamp.replace("Z", "+00:00")),
        sensor=sensor,
        resolution_m=resolution_m,
        image_reference=file_path,
        geospatial_bounds=dummy_bounds
    )
    
    obs = await obs_repo.create(obs_in, id)
    await inv_repo.update(id, {"observation_ids": inv.observation_ids + [obs.id]})
    return obs

async def run_analysis(investigation_id: str):
    try:
        logger.info(f"[INV-{investigation_id}] Analysis started")
        
        # 1. Get observation
        observations = await obs_repo.get_by_investigation(investigation_id)
        if not observations:
            logger.error(f"[INV-{investigation_id}] No observations found")
            await inv_repo.update(investigation_id, {"status": "FAILED"})
            return
        obs = observations[0]
        
        # 2. ML Detection
        logger.info(f"[INV-{investigation_id}] Running ML detection")
        det_in = await ml_client.detect(obs)
        det = await det_repo.create(det_in)
        await inv_repo.update(investigation_id, {"detection_id": det.id})
        
        if not det.detected:
            logger.info(f"[INV-{investigation_id}] No slick detected. Stopping.")
            await inv_repo.update(investigation_id, {"status": "COMPLETED"})
            return
            
        # 3. Environment & Drift Reconstruction
        logger.info(f"[INV-{investigation_id}] Running drift reconstruction")
        # Dummy environment for prototype
        env = {"current_speed_kn": 0.5, "current_dir_deg": 45, "wind_speed_kn": 10.0, "wind_dir_deg": 90}
        rec_in = drift_engine.reconstruct(det, env)
        rec = await rec_repo.create(rec_in)
        await inv_repo.update(investigation_id, {"reconstruction_id": rec.id})
        
        # 4. AIS Query (Candidates)
        logger.info(f"[INV-{investigation_id}] Querying AIS candidates")
        candidates = await vessel_repo.find_candidates(
            source_region=rec.source_region,
            start_time=rec.release_window.start_time,
            end_time=rec.release_window.end_time
        )
        logger.info(f"[INV-{investigation_id}] Found {len(candidates)} candidates")
        
        # 5. Evidence Fusion & Attribution
        logger.info(f"[INV-{investigation_id}] Running evidence fusion")
        features = evidence_engine.generate_features(candidates, det, rec)
        ranked_candidates = attribution_engine.rank(candidates, features)
        
        # We don't save the full fusion payload in Mongo to avoid bloating,
        # but in a real system we'd save CandidateFeatures and EvidenceScore.
        candidate_ids = [c.vessel.vessel_id for c in ranked_candidates]
        await inv_repo.update(investigation_id, {"candidate_ids": candidate_ids, "status": "COMPLETED"})
        
        logger.info(f"[INV-{investigation_id}] Analysis completed")
    except Exception as e:
        logger.exception(f"[INV-{investigation_id}] Analysis failed: {e}")
        await inv_repo.update(investigation_id, {"status": "FAILED"})


@router.post("/{id}/analyze")
async def trigger_analysis(id: str, background_tasks: BackgroundTasks):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    await inv_repo.update(id, {"status": "ANALYZING"})
    background_tasks.add_task(run_analysis, id)
    return {"job_id": id, "status": "QUEUED"}

@router.get("/{id}/full")
async def get_full_investigation(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    obs = await obs_repo.get_by_investigation(id)
    det = await det_repo.get_by_investigation(id)
    rec = await rec_repo.get_by_investigation(id)
    
    response = {
        "investigation": inv.model_dump(by_alias=True) if inv else None,
        "observation": obs[0].model_dump(by_alias=True) if obs else None,
        "detection": det.model_dump(by_alias=True) if det else None,
        "reconstruction": rec.model_dump(by_alias=True) if rec else None,
        "environment": {"wind_speed_kn": 10.0, "current_speed_kn": 0.5},
        "candidates": [] # In a full impl, we'd persist the ranked results and fetch them here
    }
    
    if rec and inv.status == "COMPLETED":
        # Let's quickly re-run ranking on the fly to return in the API for the prototype
        candidates = await vessel_repo.find_candidates(
            source_region=rec.source_region,
            start_time=rec.release_window.start_time,
            end_time=rec.release_window.end_time
        )
        if candidates and det:
            features = evidence_engine.generate_features(candidates, det, rec)
            ranked_candidates = attribution_engine.rank(candidates, features)
            response["candidates"] = [r.model_dump() for r in ranked_candidates]
            
    return response

@router.get("/{id}/timeline")
async def get_timeline(id: str):
    # Dummy timeline for prototype
    return [
        {"timestamp": "08:30", "event": "AIS activity recorded"},
        {"timestamp": "10:30", "event": "SAR observation"},
        {"timestamp": "10:31", "event": "ML detection"}
    ]
