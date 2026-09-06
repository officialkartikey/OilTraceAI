import cv2
import numpy as np
import base64
from typing import Dict, Any, Optional
import logging
import math

logger = logging.getLogger(__name__)

ARABIAN_SEA_BOUNDS = {
    "min_lat": -5.0,
    "max_lat": 30.5,
    "min_lon": 43.0,
    "max_lon": 80.0,
}


def is_in_arabian_sea_operating_area(lat: float, lon: float) -> bool:
    """
    Broad operating envelope for the Arabian Sea and connected approaches.
    This intentionally includes coastal margins so uploaded scenes near ports
    and EEZ boundaries are accepted while clearly unrelated coordinates are rejected.
    """
    return (
        ARABIAN_SEA_BOUNDS["min_lat"] <= lat <= ARABIAN_SEA_BOUNDS["max_lat"]
        and ARABIAN_SEA_BOUNDS["min_lon"] <= lon <= ARABIAN_SEA_BOUNDS["max_lon"]
    )


def longitude_degrees_for_km(km: float, lat: float) -> float:
    cos_lat = max(abs(math.cos(math.radians(lat))), 0.01)
    return km / (111.320 * cos_lat)


def latitude_degrees_for_km(km: float) -> float:
    return km / 110.574


def bounding_box_around_point(lat: float, lon: float, radius_km: float) -> Dict[str, Any]:
    lat_delta = latitude_degrees_for_km(radius_km)
    lon_delta = longitude_degrees_for_km(radius_km, lat)
    return {
        "type": "Polygon",
        "coordinates": [[
            [lon - lon_delta, lat - lat_delta],
            [lon + lon_delta, lat - lat_delta],
            [lon + lon_delta, lat + lat_delta],
            [lon - lon_delta, lat + lat_delta],
            [lon - lon_delta, lat - lat_delta],
        ]],
    }


def geometry_centroid(geometry: Optional[Dict[str, Any]]) -> Optional[tuple[float, float]]:
    if not geometry or "coordinates" not in geometry:
        return None

    try:
        if geometry.get("type") == "Polygon":
            coords = geometry["coordinates"][0]
        elif geometry.get("type") == "MultiPolygon":
            coords = geometry["coordinates"][0][0]
        else:
            return None

        if not coords:
            return None

        open_ring = coords[:-1] if len(coords) > 1 and coords[0] == coords[-1] else coords
        lons = [c[0] for c in open_ring]
        lats = [c[1] for c in open_ring]
        return sum(lons) / len(lons), sum(lats) / len(lats)
    except (KeyError, IndexError, TypeError, ZeroDivisionError):
        return None

def extract_geographic_polygon(mask_b64: str, bounds: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Extracts a GeoJSON Polygon or MultiPolygon from a base64 encoded binary mask.
    Transforms pixel coordinates into geographic coordinates based on the observation bounds.
    """
    if not mask_b64 or not bounds or "coordinates" not in bounds:
        logger.warning("Missing mask or geospatial bounds for georeferencing.")
        return None

    try:
        # Decode the base64 mask
        mask_data = base64.b64decode(mask_b64)
        nparr = np.frombuffer(mask_data, np.uint8)
        mask = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        
        if mask is None:
            logger.error("Failed to decode image from mask_base64.")
            return None

        # Threshold to ensure binary
        _, thresh = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

        # Find contours
        contours, hierarchy = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return None

        # Filter out tiny noise contours
        min_area = 50 # Configurable
        valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]

        if not valid_contours:
            return None

        # Get the bounds of the image in geographic coordinates
        # Assume bounds is a Polygon with at least 5 points (closing the loop)
        # Typically represented as [[ [lon_min, lat_min], [lon_max, lat_min], [lon_max, lat_max], [lon_min, lat_max], [lon_min, lat_min] ]]
        coords = bounds["coordinates"][0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        
        lon_min, lon_max = min(lons), max(lons)
        lat_min, lat_max = min(lats), max(lats)
        
        img_h, img_w = mask.shape

        def pixel_to_geo(px_x, px_y):
            # Normalize pixel coords (0 to 1)
            norm_x = px_x / img_w
            norm_y = px_y / img_h
            
            # Interpolate geographic coords
            # Assuming origin (0,0) is top-left, which means lat goes from max to min
            geo_lon = lon_min + norm_x * (lon_max - lon_min)
            geo_lat = lat_max - norm_y * (lat_max - lat_min)
            return [geo_lon, geo_lat]

        geo_polygons = []

        for contour in valid_contours:
            # Simplify contour to reduce vertices (Douglas-Peucker)
            epsilon = 0.005 * cv2.arcLength(contour, True) # 0.5% tolerance
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Need at least 3 points for a valid polygon (OpenCV returns shape (N, 1, 2))
            if len(approx) < 3:
                continue

            geo_ring = []
            for pt in approx:
                px_x, px_y = pt[0]
                geo_ring.append(pixel_to_geo(px_x, px_y))
                
            # Close the ring for GeoJSON standard
            geo_ring.append(geo_ring[0])
            geo_polygons.append([geo_ring])
            
        if not geo_polygons:
            return None

        if len(geo_polygons) == 1:
            return {
                "type": "Polygon",
                "coordinates": geo_polygons[0]
            }
        else:
            return {
                "type": "MultiPolygon",
                "coordinates": geo_polygons
            }

    except Exception as e:
        logger.error(f"Error extracting polygon from mask: {e}")
        return None
