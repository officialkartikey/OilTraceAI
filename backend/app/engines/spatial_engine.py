import math
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

    def score(self, track: VesselTrack, source_region: dict) -> float:
        """
        Calculate spatial compatibility: minimum distance from track to source region perimeter/interior.
        """
        # For a truly honest prototype, we calculate distance to the polygon edges.
        # Since source region is a simple rectangle in our drift model:
        coords = source_region["coordinates"][0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        
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
