from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ModelProvenance(BaseModel):
    name: str
    version: str

class DetectionBase(BaseModel):
    detected: bool
    confidence: Optional[float] = None
    area_pct: Optional[float] = None
    geometry: Optional[Dict[str, Any]] = None # GeoJSON Polygon
    mask_ref: Optional[str] = None
    probability_map_ref: Optional[str] = None
    model: Optional[ModelProvenance] = None

class DetectionCreate(DetectionBase):
    investigation_id: str
    observation_id: str

class Detection(DetectionBase):
    id: str = Field(..., alias="_id")
    investigation_id: str
    observation_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
