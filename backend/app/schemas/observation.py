from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ObservationBase(BaseModel):
    timestamp: datetime
    sensor: str
    resolution_m: Optional[float] = None
    geospatial_bounds: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class ObservationCreate(ObservationBase):
    image_reference: str

class Observation(ObservationBase):
    id: str = Field(..., alias="_id")
    investigation_id: str
    image_reference: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
