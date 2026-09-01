import logging
import traceback
from datetime import datetime
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.detection_repository import DetectionRepository
from app.repositories.reconstruction_repository import ReconstructionRepository
from app.repositories.vessel_repository import VesselRepository
from app.repositories.attribution_repository import attribution_repo
from app.services.ml_client import ml_client
from app.services.environment_service import environment_service
from app.engines.drift_engine import drift_engine
from app.engines.evidence_engine import evidence_engine
from app.engines.attribution_engine import attribution_engine

logger = logging.getLogger(__name__)

class InvestigationOrchestrator:
    def __init__(self):
        self.inv_repo = InvestigationRepository()
        self.obs_repo = ObservationRepository()
        self.det_repo = DetectionRepository()
        self.rec_repo = ReconstructionRepository()
        self.vessel_repo = VesselRepository()

    async def fail_investigation(self, inv_id: str, stage: str, e: Exception):
        logger.exception(f"[INV-{inv_id}] Failed at {stage}: {e}")
        failure = {
            "stage": stage,
            "code": type(e).__name__,
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        await self.inv_repo.update(inv_id, {"status": "FAILED", "failure": failure})

    async def analyze(self, investigation_id: str):
        try:
            logger.info(f"[INV-{investigation_id}] Pipeline started")
            await self.inv_repo.update(investigation_id, {"status": "ANALYZING"})

            # 1. Observation
            stage = "OBSERVATION"
            observations = await self.obs_repo.get_by_investigation(investigation_id)
            if not observations:
                raise ValueError("No observations found")
            obs = observations[0]

            # 2. Detection
            stage = "DETECTION"
            det = await self.det_repo.get_by_investigation(investigation_id)
            if not det:
                det_in = await ml_client.detect(obs)
                det = await self.det_repo.create(det_in)
                await self.inv_repo.update(investigation_id, {"detection_id": det.id})
            
            if not det.detected:
                # We stop gracefully if no slick is detected
                await self.inv_repo.update(investigation_id, {"status": "COMPLETED"})
                logger.info(f"[INV-{investigation_id}] No slick detected. Stopping pipeline.")
                return

            # 3. Environment & Drift
            stage = "DRIFT_RECONSTRUCTION"
            env = environment_service.get_for_region_and_time(
                geometry=det.geometry, 
                start_time=obs.timestamp, 
                end_time=obs.timestamp
            )
            rec_in = drift_engine.reconstruct(det, env, observation=obs)
            rec = await self.rec_repo.create(rec_in)
            await self.inv_repo.update(investigation_id, {"reconstruction_id": rec.id})

            # 4. AIS Query (Candidates)
            stage = "AIS_CANDIDATE_SEARCH"
            candidates = await self.vessel_repo.find_candidates(
                source_region=rec.source_region,
                start_time=rec.release_window.start_time,
                end_time=rec.release_window.end_time
            )

            # 5. Evidence Fusion & Attribution
            stage = "EVIDENCE_FUSION"
            if candidates:
                features = evidence_engine.generate_features(candidates, det, rec)
                ranked_candidates = attribution_engine.rank(candidates, features)
                
                # Persist attribution
                attr_id = await attribution_repo.create(
                    investigation_id, 
                    [r.model_dump() for r in ranked_candidates]
                )
                candidate_ids = [c.vessel.vessel_id for c in ranked_candidates]
                await self.inv_repo.update(investigation_id, {
                    "candidate_ids": candidate_ids,
                    "attribution_id": attr_id,
                    "status": "COMPLETED"
                })
            else:
                await self.inv_repo.update(investigation_id, {"status": "COMPLETED"})
                logger.warning(f"[INV-{investigation_id}] No candidates found.")

            logger.info(f"[INV-{investigation_id}] Pipeline completed")

        except Exception as e:
            await self.fail_investigation(investigation_id, stage, e)

orchestrator = InvestigationOrchestrator()
