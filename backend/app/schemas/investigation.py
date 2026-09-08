from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class InvestigationBase(BaseModel):
    pass

class InvestigationCreate(InvestigationBase):
    pass

class InvestigationFailure(BaseModel):
    stage: str
    code: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Investigation(InvestigationBase):
    id: str = Field(..., alias="_id")
    status: str = "CREATED"
    current_stage: str = "INITIALIZING"
    observation_ids: List[str] = []
    detection_id: Optional[str] = None
    reconstruction_id: Optional[str] = None
    candidate_ids: List[str] = []
    attribution_id: Optional[str] = None
    # Provenance of the AIS traffic used for attribution: "real" when the
    # database held vessel records covering the reconstructed source region,
    # "simulated" when no such coverage existed and traffic had to be
    # synthesised for this region/window.
    ais_data_source: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    failure: Optional[InvestigationFailure] = None

    class Config:
        populate_by_name = True