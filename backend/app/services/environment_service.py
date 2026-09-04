import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.schemas.environment import EnvironmentSnapshot, EnvironmentData

class EnvironmentService:
    def __init__(self):
        # Allow disabling synthetic fallbacks via env var
        self.use_synthetic = os.environ.get("DEMO_SYNTHETIC_ENVIRONMENT", "true").lower() == "true"

    def get_for_region_and_time(self, geometry: Dict[str, Any], start_time: datetime, end_time: datetime) -> EnvironmentSnapshot:
        """
        Fetches environment data for a given region and time window.
        Returns a time series (hourly).
        """
        if not self.use_synthetic:
            # In a non-synthetic environment, if we don't have real data API integrated, we return UNAVAILABLE.
            return EnvironmentSnapshot(
                status="UNAVAILABLE",
                source=None,
                reason="Real environmental data integration is not configured and synthetic fallback is disabled.",
                data=None
            )

        # Generate a synthetic hourly time series for prototype demonstration
        data_series: List[EnvironmentData] = []
        
        # Ensure we cover the window in hourly steps
        current_t = start_time.replace(minute=0, second=0, microsecond=0)
        end_t = end_time.replace(minute=0, second=0, microsecond=0)
        if current_t > end_t:
            current_t, end_t = end_t, current_t
        
        # Add at least one step if they are identical
        if current_t == end_t:
            end_t += timedelta(hours=1)

        while current_t <= end_t:
            # Synthetic variation based on hour
            hour_factor = current_t.hour / 24.0
            
            data_series.append(EnvironmentData(
                timestamp=current_t.isoformat() + "Z",
                current_speed_kn=0.5 + (0.1 * hour_factor),
                current_dir_deg=45.0 + (10 * hour_factor),
                wind_speed_kn=10.0 + (5 * hour_factor),
                wind_dir_deg=90.0 - (20 * hour_factor)
            ))
            current_t += timedelta(hours=1)

        return EnvironmentSnapshot(
            status="AVAILABLE",
            source="synthetic_demo_timeseries",
            data=data_series
        )

environment_service = EnvironmentService()
