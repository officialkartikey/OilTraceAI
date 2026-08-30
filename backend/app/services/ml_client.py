import httpx
import logging
from app.core.config import settings
from app.schemas.observation import Observation
from app.schemas.detection import DetectionCreate, ModelProvenance
import base64

logger = logging.getLogger(__name__)

class MLClient:
    def __init__(self):
        self.base_url = settings.ml_service_url

    async def detect(self, observation: Observation) -> DetectionCreate:
        logger.info(f"Calling ML service at {self.base_url}/analyze")
        
        # In a real app we'd load the file from observation.image_reference
        # For the prototype, we assume the ML service accepts an image file upload.
        # We'll just pass a dummy image to the ML service to get the response.
        
        # Creating a minimal valid PNG in memory just for the mock call if needed,
        # or assuming the ML service can handle a request.
        # Looking at `api_server.py`, it requires a file upload.
        # We will create a dummy 1x1 png image payload if the file doesn't exist,
        # but realistically, `image_reference` should point to a valid file.
        
        try:
            # Let's try to read the file
            with open(observation.image_reference, "rb") as f:
                image_data = f.read()
        except Exception as e:
            logger.warning(f"Failed to read image {observation.image_reference}: {e}. Creating dummy image.")
            # 1x1 black png
            image_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==")
        
        files = {"file": ("image.png", image_data, "image/png")}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(f"{self.base_url}/analyze", files=files)
                response.raise_for_status()
                data = response.json()
                
                # Parse ML response into our internal domain schema
                det_data = data.get("detection", {})
                detected = det_data.get("slick_detected", False)
                confidence = det_data.get("confidence")
                area_pct = det_data.get("area_pct")
                
                # Create a mock geometry for prototype if not provided
                centroid = det_data.get("centroid_px")
                geometry = None
                if detected:
                    # In a real system, the ML would output geo-referenced polygons.
                    # Here we construct a dummy GeoJSON polygon near the observation location.
                    # For prototype, we will just pass down a synthetic polygon later or construct it here.
                    pass
                
                return DetectionCreate(
                    investigation_id=observation.investigation_id,
                    observation_id=observation.id,
                    detected=detected,
                    confidence=confidence,
                    area_km2=area_pct, # Mocking area
                    geometry=geometry,
                    mask_ref=data.get("artifacts", {}).get("mask_base64"),
                    model=ModelProvenance(
                        name=data.get("model", {}).get("name", "Unknown"),
                        version=data.get("model", {}).get("version", "Unknown")
                    )
                )
            except httpx.HTTPError as e:
                logger.error(f"ML Service HTTP error: {e}")
                raise

ml_client = MLClient()
