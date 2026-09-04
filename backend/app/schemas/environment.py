from pydantic import BaseModel
from typing import Optional, Dict, Any

class EnvironmentData(BaseModel):
    timestamp: str
    current_speed_kn: float
    current_dir_deg: float
    wind_speed_kn: float
    wind_dir_deg: float

class EnvironmentSnapshot(BaseModel):
    status: str
    source: Optional[str] = None
    reason: Optional[str] = None
    data: Optional[list[EnvironmentData]] = None
