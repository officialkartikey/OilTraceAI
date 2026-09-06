import math
from typing import Any, Tuple, Optional
from app.schemas.vessel import VesselTrack

class SpatialEngine:
    def __init__(self):
        pass
        
    def haversine(self, lon1, lat1, lon2, lat2):
        R = 6371.0 # km
        dLat = math.radians(lat2 - lat1)
        dLon = math.radians(lon2 - lon1)
        a = math.sin(dLat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def extract_coordinates(self, geometry: Any) -> list[list[float]]:
        """
        Recursively extract all [lon, lat] coordinate pairs from any GeoJSON geometry or nested list.
        """
        coords = geometry.get("coordinates", []) if isinstance(geometry, dict) else (geometry if isinstance(geometry, (list, tuple)) else [])
        flattened: list[list[float]] = []
        def _extract(c):
            if isinstance(c, (list, tuple)):
                if len(c) >= 2 and isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                    flattened.append([float(c[0]), float(c[1])])
                else:
                    for sub in c:
                        _extract(sub)
        _extract(coords)
        return flattened

    def get_centroid(self, geometry: Any, default_lon: float = 72.85, default_lat: float = 19.05) -> Tuple[float, float]:
        """
        Calculate centroid (lon, lat) of any GeoJSON geometry with fallback defaults.
        """
        pts = self.extract_coordinates(geometry)
        if pts:
            return sum([p[0] for p in pts]) / len(pts), sum([p[1] for p in pts]) / len(pts)
        return default_lon, default_lat

    def score(self, track: VesselTrack, source_region: dict) -> float:
        """
        Calculate spatial compatibility: minimum distance from track to source region perimeter/interior.
        Combines robust geometry parsing with polygon perimeter/interior distance calculations.
        """
        pts = self.extract_coordinates(source_region)
        if pts:
            lons = [c[0] for c in pts]
            lats = [c[1] for c in pts]
            min_lon, max_lon = min(lons), max(lons)
            min_lat, max_lat = min(lats), max(lats)
            cent_lon = sum(lons) / len(lons)
            cent_lat = sum(lats) / len(lats)
        else:
            min_lon, max_lon = 72.85, 72.85
            min_lat, max_lat = 19.05, 19.05
            cent_lon, cent_lat = 72.85, 19.05
        
        min_dist = float('inf')
        for pos in track.positions:
            lon, lat = pos.location["coordinates"]
            
            # Point in polygon check for AABB
            if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                return 1.0 # Inside the region
                
            # Otherwise find distance to nearest edge
            clon = max(min_lon, min(lon, max_lon))
            clat = max(min_lat, min(lat, max_lat))
            
            dist = self.haversine(lon, lat, clon, clat)
            if dist < min_dist:
                min_dist = dist
                
        # Normalize: < 5km is 1.0, 20km is 0.0
        if min_dist < 5.0:
            return 1.0
        elif min_dist > 20.0:
            return 0.0
        else:
            return 1.0 - ((min_dist - 5.0) / 15.0)

spatial_engine = SpatialEngine()
