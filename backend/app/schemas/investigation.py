from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class InvestigationBase(BaseModel):
    pass

class InvestigationCreate(InvestigationBase):
    pass

class Investigation(InvestigationBase):
    id: str = Field(..., alias="_id")
    status: str = "CREATED"
    observation_ids: List[str] = []
    detection_id: Optional[str] = None
    reconstruction_id: Optional[str] = None
    candidate_ids: List[str] = []
    attribution_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
