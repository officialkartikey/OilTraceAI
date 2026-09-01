from typing import Dict, Any
from datetime import datetime
from app.schemas.environment import EnvironmentSnapshot

class EnvironmentService:
    def __init__(self):
        pass
        
    def get_for_region_and_time(self, geometry: Dict[str, Any], start_time: datetime, end_time: datetime) -> EnvironmentSnapshot:
        """
        Deterministic environment fetcher for prototype.
        In production, this would query NOAA or Copernicus APIs.
        """
        return EnvironmentSnapshot(
            current_speed_kn=0.5,
            current_dir_deg=45.0,
            wind_speed_kn=10.0,
            wind_dir_deg=90.0,
            source_type="synthetic_demo"
        )

environment_service = EnvironmentService()
