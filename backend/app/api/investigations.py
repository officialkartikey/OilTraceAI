from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from fpdf import FPDF
import tempfile
import os
from typing import Optional, List
from app.schemas.investigation import InvestigationCreate, Investigation
from app.schemas.observation import ObservationCreate, Observation
from app.schemas.fusion import InvestigationResult
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.detection_repository import DetectionRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.vessel_repository import VesselRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.vessel_repository import VesselRepository
from app.repositories.attribution_repository import attribution_repo
from app.services.investigation_orchestrator import orchestrator
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

@router.get("/alerts")
async def get_alerts():
    # Fetch latest 10 investigations to serve as mock alerts
    invs = await inv_repo.collection.find().sort("created_at", -1).to_list(10)
    alerts = []
    for inv in invs:
        # Generate an alert format based on the investigation
        alerts.append({
            "_id": str(inv["_id"]),
            "observation_id": inv.get("observation_ids", ["unknown"])[0] if inv.get("observation_ids") else "N/A",
            "timestamp": inv.get("created_at", "").isoformat() if hasattr(inv.get("created_at", ""), "isoformat") else str(inv.get("created_at", "")),
            "satellite": "Sentinel-1",
            "image_file": "placeholder.png"
        })
    return {"success": True, "alerts": alerts}

@router.get("/spills")
async def get_active_spills():
    invs = await inv_repo.list()
    results = []
    for inv in invs:
        # Get det for area and loc
        det = await det_repo.get_by_investigation(inv.id)
        
        area = det.area_km2 if (det and det.area_km2 is not None) else 0.0
        lat, lng = 19.0, 72.8 # default
        
        results.append({
            "id": inv.id,
            "name": f"Incident-{inv.id[-4:].upper()}",
            "detectedAt": inv.created_at.isoformat(),
            "status": "RESOLVED" if inv.status == "COMPLETED" else "ACTIVE",
            "areaSqKm": area,
            "currentLocation": {"lat": lat, "lng": lng},
            "hindcastOrigin": {"lat": 19.05, "lng": 72.85},
            "culpritFound": len(inv.candidate_ids) > 0 if inv.candidate_ids else False
        })
    return {"success": True, "data": results}

@router.get("/{id}", response_model=Investigation)
async def get_investigation(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

from fastapi import UploadFile, File, Form
import cloudinary
import cloudinary.uploader
from app.core.config import settings

# Configure Cloudinary using settings
cloudinary.config( 
    cloud_name = settings.cloudinary_cloud_name, 
    api_key = settings.cloudinary_api_key, 
    api_secret = settings.cloudinary_api_secret,
    secure=True
)

@router.post("/{id}/observations", response_model=Observation)
async def add_observation(
    id: str, 
    timestamp: str = Form(...),
    sensor: str = Form(...),
    resolution_m: Optional[float] = Form(None),
    lat: float = Form(...),
    lon: float = Form(...),
    file: UploadFile = File(...)
):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    # Upload the file to Cloudinary
    try:
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="kairos_observations"
        )
        image_url = upload_result.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")
        
    # Create the observation
    from datetime import datetime
    import json
    
    # Simple polygon bounds around the provided lat/lon
    # Create a roughly 30x30km box around the lat/lon
    offset = 0.15 # approx 15km
    generated_bounds = {
        "type": "Polygon",
        "coordinates": [[[lon - offset, lat - offset], [lon + offset, lat - offset], [lon + offset, lat + offset], [lon - offset, lat + offset], [lon - offset, lat - offset]]]
    }
    
    obs_in = ObservationCreate(
        timestamp=datetime.fromisoformat(timestamp.replace("Z", "+00:00")),
        sensor=sensor,
        resolution_m=resolution_m,
        image_reference=image_url,
        geospatial_bounds=generated_bounds
    )
    
    obs = await obs_repo.create(obs_in, id)
    await inv_repo.update(id, {"observation_ids": inv.observation_ids + [obs.id]})
    return obs

@router.post("/{id}/analyze")
async def trigger_analysis(id: str, background_tasks: BackgroundTasks):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    background_tasks.add_task(orchestrator.analyze, id)
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
        "environment": rec.parameters.get("environment") if rec and hasattr(rec, "parameters") and rec.parameters else None,
        "candidates": [] # In a full impl, we'd persist the ranked results and fetch them here
    }
    
    if rec and inv.status == "COMPLETED":
        # Fetch the real persisted attribution results
        attr_data = await attribution_repo.get_by_investigation(id)
        if attr_data and "ranked_candidates" in attr_data:
            response["candidates"] = attr_data["ranked_candidates"]
            
    return response


@router.get("/{id}/report")
async def generate_report(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=15)
    pdf.cell(200, 10, text="Kairos Investigation Report", ln=True, align='C')
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, text=f"Investigation ID: {inv.id}", ln=True)
    pdf.cell(200, 10, text=f"Status: {inv.status}", ln=True)
    pdf.cell(200, 10, text=f"Created At: {inv.created_at}", ln=True)
    
    # Very basic report generation for demo
    det = await det_repo.get_by_investigation(id)
    if det:
        pdf.cell(200, 10, text=f"Detection Confidence: {det.confidence}", ln=True)
        pdf.cell(200, 10, text=f"Slick Detected: {det.detected}", ln=True)
    
    rec = await rec_repo.get_by_investigation(id)
    if rec:
        pdf.cell(200, 10, text=f"Release Window: {rec.release_window.start_time} - {rec.release_window.end_time}", ln=True)
        
    if inv.candidate_ids:
        pdf.cell(200, 10, text=f"Candidates Found: {len(inv.candidate_ids)}", ln=True)
    
    tmp_path = os.path.join(tempfile.gettempdir(), f"report_{id}.pdf")
    pdf.output(tmp_path)
    
    return FileResponse(tmp_path, media_type='application/pdf', filename=f"Kairos_Report_{id}.pdf")

@router.get("/{id}/timeline")
async def get_timeline(id: str):
    inv = await inv_repo.get(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    events = []
    
    events.append({
        "timestamp": inv.created_at.isoformat() if getattr(inv, 'created_at', None) else "Unknown",
        "event": "Investigation workspace initialized"
    })
    
    obs_list = await obs_repo.get_by_investigation(id)
    if obs_list:
        obs = obs_list[0]
        events.append({
            "timestamp": obs.timestamp.isoformat(),
            "event": f"SAR observation ({obs.sensor}) recorded"
        })
        
    det = await det_repo.get_by_investigation(id)
    if det:
        events.append({
            "timestamp": det.created_at.isoformat() if getattr(det, 'created_at', None) else "Unknown",
            "event": "ML detection completed - Slick found" if det.detected else "ML detection completed - No slick"
        })
        
    rec = await rec_repo.get_by_investigation(id)
    if rec:
        events.append({
            "timestamp": rec.created_at.isoformat() if getattr(rec, 'created_at', None) else "Unknown",
            "event": "Drift reconstruction completed. Source region estimated."
        })
        
    if inv.status == "COMPLETED" and rec:
        events.append({
            "timestamp": inv.updated_at.isoformat() if getattr(inv, 'updated_at', None) else "Unknown",
            "event": f"Candidate analysis completed. {len(inv.candidate_ids)} potential sources ranked."
        })
    elif inv.status == "FAILED":
        events.append({
            "timestamp": inv.updated_at.isoformat() if getattr(inv, 'updated_at', None) else "Unknown",
            "event": "Analysis failed."
        })
        
    return events
