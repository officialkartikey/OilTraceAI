import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.schemas.detection import Detection
from app.schemas.reconstruction import ReconstructionCreate, TimeWindow
from app.schemas.environment import EnvironmentSnapshot
from app.core.gis import bounding_box_around_point, geometry_centroid

class DriftEngine:
    def __init__(self):
        self.time_step_hours = 1.0
        # Wind drift factor is typically ~3%
        self.wind_factor = 0.03
        
    def _calculate_velocity(self, env_data) -> tuple[float, float]:
        """Returns u, v components in m/s"""
        current_speed_ms = env_data.current_speed_kn * 0.514444
        wind_speed_ms = env_data.wind_speed_kn * 0.514444
        
        # Calculate u, v components (direction TO)
        curr_rad = math.radians(90 - env_data.current_dir_deg)
        curr_u = current_speed_ms * math.cos(curr_rad)
        curr_v = current_speed_ms * math.sin(curr_rad)
        
        wind_rad = math.radians(90 - env_data.wind_dir_deg)
        wind_u = wind_speed_ms * self.wind_factor * math.cos(wind_rad)
        wind_v = wind_speed_ms * self.wind_factor * math.sin(wind_rad)
        
        total_u = curr_u + wind_u
        total_v = curr_v + wind_v
        
        return total_u, total_v

    def _get_env_for_time(self, env_snap: EnvironmentSnapshot, target_time: datetime):
        if not env_snap.data:
            return None
            
        # Find closest data point
        closest = None
        min_diff = float('inf')
        for d in env_snap.data:
            dt = datetime.fromisoformat(d.timestamp.replace("Z", "+00:00")).replace(tzinfo=None)
            diff = abs((dt - target_time.replace(tzinfo=None)).total_seconds())
            if diff < min_diff:
                min_diff = diff
                closest = d
        return closest

    def reconstruct(self, detection: Detection, environment: EnvironmentSnapshot, observation = None, max_hindcast_hours: int = 12) -> ReconstructionCreate:
        if environment.status != "AVAILABLE" or not environment.data:
            raise ValueError(f"Cannot perform drift reconstruction: Environment data is {environment.status}")

        centroid = geometry_centroid(detection.geometry)
        if not centroid and observation:
            centroid = geometry_centroid(observation.geospatial_bounds)
        if not centroid:
            raise ValueError("Cannot perform drift reconstruction without georeferenced detection or observation bounds")
        start_lon, start_lat = centroid

        base_time = observation.timestamp if observation else detection.created_at
        if base_time.tzinfo is not None:
            base_time = base_time.replace(tzinfo=None)

        current_time = base_time
        current_lon, current_lat = start_lon, start_lat
        
        track = []
        track.append({"lon": current_lon, "lat": current_lat, "timestamp": current_time.isoformat() + "Z"})
        
        # Approx meters to degrees
        lat_deg_per_m = 1.0 / 111320.0
        
        hours_simulated = 0
        
        while hours_simulated < max_hindcast_hours:
            env_data = self._get_env_for_time(environment, current_time)
            if not env_data:
                break
                
            total_u, total_v = self._calculate_velocity(env_data)
            
            # Backward tracking
            back_u = -total_u
            back_v = -total_v
            
            total_seconds = self.time_step_hours * 3600
            lon_scale = max(abs(math.cos(math.radians(current_lat))), 0.01)
            lon_deg_per_m = 1.0 / (111320.0 * lon_scale)
            
            current_lon += (back_u * total_seconds * lon_deg_per_m)
            current_lat += (back_v * total_seconds * lat_deg_per_m)
            current_time -= timedelta(hours=self.time_step_hours)
            
            track.append({"lon": current_lon, "lat": current_lat, "timestamp": current_time.isoformat() + "Z"})
            hours_simulated += self.time_step_hours

        # Uncertainty grows with time, e.g. 1km per hour simulated
        uncertainty_km = 2.0 + (hours_simulated * 1.0)
        final_lon, final_lat = current_lon, current_lat
        source_region = bounding_box_around_point(lat=final_lat, lon=final_lon, radius_km=uncertainty_km)
        
        # Release window: We consider the time at the end of the hindcast +/- 1 hour
        end_time = current_time + timedelta(hours=1)
        start_time = current_time - timedelta(hours=1)
        
        return ReconstructionCreate(
            investigation_id=detection.investigation_id,
            parameters={
                "max_hindcast_hours": max_hindcast_hours,
                "wind_factor": self.wind_factor,
                "environment_source": environment.source
            },
            release_window=TimeWindow(start_time=start_time, end_time=end_time),
            source_region=source_region,
            hindcast_track=track,
            horizon_hours=hours_simulated,
            uncertainty_km=uncertainty_km,
            confidence=max(0.1, 0.9 - (hours_simulated * 0.05)),
            model_version="time-stepped-v1.0"
        )

drift_engine = DriftEngine()
