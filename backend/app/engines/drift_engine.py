import math
from datetime import datetime, timedelta
from app.schemas.detection import Detection
from app.schemas.reconstruction import ReconstructionCreate, TimeWindow

from app.schemas.environment import EnvironmentSnapshot

class DriftEngine:
    def __init__(self):
        pass

    def reconstruct(self, detection: Detection, environment: EnvironmentSnapshot, observation = None, duration_hours: int = 2, time_step_min: int = 10) -> ReconstructionCreate:
        """
        Backward particle tracking.
        For prototype, we use a simple vector addition:
        v_drift = v_current + (wind_weight * v_wind)
        """
        current_speed_kn = environment.current_speed_kn
        current_dir_deg = environment.current_dir_deg
        wind_speed_kn = environment.wind_speed_kn
        wind_dir_deg = environment.wind_dir_deg
        
        # In a real system, we'd take the geometry. For demo, we assume a point at 19.05, 72.85
        # if geometry is missing.
        start_lon, start_lat = 72.85, 19.05
        if detection.geometry and "coordinates" in detection.geometry:
            # simple centroid of first ring if polygon
            coords = detection.geometry["coordinates"][0]
            start_lon = sum([c[0] for c in coords]) / len(coords)
            start_lat = sum([c[1] for c in coords]) / len(coords)
        elif observation and observation.geospatial_bounds and "coordinates" in observation.geospatial_bounds:
            coords = observation.geospatial_bounds["coordinates"][0]
            start_lon = sum([c[0] for c in coords]) / len(coords)
            start_lat = sum([c[1] for c in coords]) / len(coords)

        # Convert knots to m/s
        current_speed_ms = current_speed_kn * 0.514444
        wind_speed_ms = wind_speed_kn * 0.514444
        
        # Wind drift factor is typically ~3%
        wind_factor = 0.03
        
        # Calculate u, v components (oceanographic convention: direction it is going TO)
        # Note: meteorological wind is where it comes FROM, but let's assume direction is TO for simplicity
        curr_rad = math.radians(90 - current_dir_deg)
        curr_u = current_speed_ms * math.cos(curr_rad)
        curr_v = current_speed_ms * math.sin(curr_rad)
        
        wind_rad = math.radians(90 - wind_dir_deg)
        wind_u = wind_speed_ms * wind_factor * math.cos(wind_rad)
        wind_v = wind_speed_ms * wind_factor * math.sin(wind_rad)
        
        total_u = curr_u + wind_u
        total_v = curr_v + wind_v
        
        # Backward tracking: reverse the velocity
        back_u = -total_u
        back_v = -total_v
        
        # Simulate over duration
        total_seconds = duration_hours * 3600
        
        # Approx meters to degrees at this latitude (1 deg lat ~ 111km)
        lat_deg_per_m = 1.0 / 111320.0
        lon_deg_per_m = 1.0 / (111320.0 * math.cos(math.radians(start_lat)))
        
        final_lon = start_lon + (back_u * total_seconds * lon_deg_per_m)
        final_lat = start_lat + (back_v * total_seconds * lat_deg_per_m)
        
        # Create a source region polygon around the final point (e.g., 10km radius box)
        box_size_deg = 10000 * lat_deg_per_m
        source_region = {
            "type": "Polygon",
            "coordinates": [[
                [final_lon - box_size_deg, final_lat - box_size_deg],
                [final_lon + box_size_deg, final_lat - box_size_deg],
                [final_lon + box_size_deg, final_lat + box_size_deg],
                [final_lon - box_size_deg, final_lat + box_size_deg],
                [final_lon - box_size_deg, final_lat - box_size_deg]
            ]]
        }
        
        # Time window calculation
        base_time = observation.timestamp if observation else detection.created_at
        end_time = base_time - timedelta(hours=duration_hours - 0.5)
        start_time = base_time - timedelta(hours=duration_hours + 0.5)
        
        return ReconstructionCreate(
            investigation_id=detection.investigation_id,
            parameters={
                "duration_hours": duration_hours,
                "wind_factor": wind_factor,
                "environment": environment.model_dump()
            },
            release_window=TimeWindow(start_time=start_time, end_time=end_time),
            source_region=source_region,
            confidence=0.85,
            model_version="1.0"
        )

drift_engine = DriftEngine()
