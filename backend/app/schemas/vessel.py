from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class AisPosition(BaseModel):
    timestamp: datetime
    location: Dict[str, Any] # GeoJSON Point
    speed: Optional[float] = None
    heading: Optional[float] = None
    course: Optional[float] = None

class VesselTrack(BaseModel):
    vessel_id: str
    mmsi: Optional[str] = None
    imo: Optional[str] = None
    name: Optional[str] = None
    vessel_type: Optional[str] = None
    positions: List[AisPosition] = []
    # True if this vessel's positions come from the AIS simulator rather than
    # a real feed. Lets the orchestrator report attribution provenance
    # accurately, even on a later run that just re-reads previously
    # generated records.
    synthetic: bool = False

class AisRecordBase(BaseModel):
    vessel_id: str
    name: Optional[str] = None
    timestamp: datetime
    location: Dict[str, Any] # GeoJSON Point
    speed: Optional[float] = None
    heading: Optional[float] = None
    course: Optional[float] = None
    vessel_type: Optional[str] = None
    mmsi: Optional[str] = None
    imo: Optional[str] = None
    synthetic: bool = False
    data_source: Optional[str] = None

class AisRecord(AisRecordBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True