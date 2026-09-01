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
        Calculate spatial compatibility.
        """
        # For simplicity, calculate distance from track points to the centroid of source region
        coords = source_region["coordinates"][0]
        cent_lon = sum([c[0] for c in coords]) / len(coords)
        cent_lat = sum([c[1] for c in coords]) / len(coords)
        
        min_dist = float('inf')
        for pos in track.positions:
            lon, lat = pos.location["coordinates"]
            dist = self.haversine(lon, lat, cent_lon, cent_lat)
            if dist < min_dist:
                min_dist = dist
                
        # Normalize: < 2km is 1.0, 10km is 0.0
        if min_dist < 2.0:
            return 1.0
        elif min_dist > 10.0:
            return 0.0
        else:
            return 1.0 - ((min_dist - 2.0) / 8.0)

spatial_engine = SpatialEngine()
