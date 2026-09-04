from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class TimeWindow(BaseModel):
    start_time: datetime
    end_time: datetime

class ReconstructionBase(BaseModel):
    parameters: Dict[str, Any]
    release_window: TimeWindow
    source_region: Dict[str, Any] # GeoJSON Polygon
    hindcast_track: Optional[List[Dict[str, Any]]] = None
    horizon_hours: Optional[float] = None
    uncertainty_km: Optional[float] = None
    confidence: float
    model_version: str

class ReconstructionCreate(ReconstructionBase):
    investigation_id: str

class Reconstruction(ReconstructionBase):
    id: str = Field(..., alias="_id")
    investigation_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
