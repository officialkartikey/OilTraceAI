from pydantic import BaseModel
from typing import Optional, Dict, Any

class EnvironmentSnapshot(BaseModel):
    current_speed_kn: float
    current_dir_deg: float
    wind_speed_kn: float
    wind_dir_deg: float
    source_type: str = "synthetic_demo"
