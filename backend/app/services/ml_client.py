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
            if observation.image_reference.startswith('http'):
                logger.info(f"Downloading image from {observation.image_reference}")
                async with httpx.AsyncClient(timeout=30.0) as dl_client:
                    img_resp = await dl_client.get(observation.image_reference)
                    img_resp.raise_for_status()
                    image_data = img_resp.content
            else:
                with open(observation.image_reference, "rb") as f:
                    image_data = f.read()
        except Exception as e:
            logger.error(f"Failed to load image {observation.image_reference}: {e}.")
            raise ValueError(f"Cannot process observation image: {e}")
        
        files = {"file": ("image.png", image_data, "image/png")}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(f"{self.base_url}/analyze", files=files)
                response.raise_for_status()
                data = response.json()
                # Parse ML response into our internal domain schema
                det_data = data.get("detection", {})
                detected = det_data.get("slick_detected", False)
                confidence = det_data.get("confidence")
                area_pct = det_data.get("area_pct")
                mask_ref = data.get("artifacts", {}).get("mask_base64")
                
                geometry = None
                if detected and mask_ref:
                    from app.core.gis import extract_geographic_polygon
                    geometry = extract_geographic_polygon(mask_ref, observation.geospatial_bounds)
                
                return DetectionCreate(
                    investigation_id=observation.investigation_id,
                    observation_id=observation.id,
                    detected=detected,
                    confidence=confidence,
                    area_pct=area_pct,
                    geometry=geometry,
                    mask_ref=mask_ref,
                    model=ModelProvenance(
                        name=data.get("model", {}).get("name", "Unknown"),
                        version=data.get("model", {}).get("version", "Unknown")
                    )
                )
            except httpx.HTTPError as e:
                logger.error(f"ML Service HTTP error: {e}")
                raise

ml_client = MLClient()
