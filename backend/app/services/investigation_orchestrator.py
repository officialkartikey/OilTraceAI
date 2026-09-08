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
from app.core.config import settings

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
            await self.inv_repo.update(investigation_id, {"status": "ANALYZING", "current_stage": "OBSERVATION"})

            # 1. Observation
            stage = "OBSERVATION"
            observations = await self.obs_repo.get_by_investigation(investigation_id)
            if not observations:
                raise ValueError("No observations found")
            obs = observations[0]

            # 2. Detection
            stage = "DETECTION"
            await self.inv_repo.update(investigation_id, {"current_stage": stage})
            det = await self.det_repo.get_by_investigation(investigation_id)
            if not det:
                det_in = await ml_client.detect(obs)
                det = await self.det_repo.create(det_in)
                await self.inv_repo.update(investigation_id, {"detection_id": det.id})
            
            logger.info(f"[ANALYSIS] Detection completed: detected={det.detected}, confidence={det.confidence}")

            if not det.detected:
                # We stop gracefully if no slick is detected
                await self.inv_repo.update(investigation_id, {"status": "COMPLETED", "current_stage": "COMPLETED"})
                logger.info(f"[INV-{investigation_id}] No slick detected. Stopping pipeline.")
                return

            # 3. Environment & Drift
            stage = "ENVIRONMENT"
            await self.inv_repo.update(investigation_id, {"current_stage": stage})
            
            # Use a time window representing the 12 hours prior to observation for env fetching
            from datetime import timedelta
            from app.engines.spatial_engine import spatial_engine
            env_start = obs.timestamp - timedelta(hours=12)
            
            env = environment_service.get_for_region_and_time(
                geometry=det.geometry or obs.geospatial_bounds, 
                start_time=env_start, 
                end_time=obs.timestamp
            )
            
            stage = "HINDCAST"
            await self.inv_repo.update(investigation_id, {"current_stage": stage})
            rec_in = drift_engine.reconstruct(det, env, observation=obs)
            rec = await self.rec_repo.create(rec_in)
            await self.inv_repo.update(investigation_id, {"reconstruction_id": rec.id})
            logger.info(
                f"[ANALYSIS] Reconstruction completed: horizon={rec.horizon_hours}h, "
                f"uncertainty={rec.uncertainty_km}km, window=[{rec.release_window.start_time} to {rec.release_window.end_time}]"
            )

            # 4. AIS Query (Candidates)
            stage = "AIS_CANDIDATE_SEARCH"
            await self.inv_repo.update(investigation_id, {"current_stage": stage})
            logger.info(f"[ANALYSIS] Starting attribution for investigation {investigation_id}")
            logger.info(f"[ATTRIBUTION] Searching AIS candidates...")
            
            candidates = await self.vessel_repo.find_candidates(
                source_region=rec.source_region,
                start_time=rec.release_window.start_time,
                end_time=rec.release_window.end_time
            )
            logger.info(f"[ATTRIBUTION] Candidate count = {len(candidates)}")

            # Public bulk AIS only covers some regions, and incident-correlated
            # AIS is rarely available at all. If no real traffic intersects the
            # reconstructed source region, fall back to simulated traffic
            # generated around *this* region and release window, so attribution
            # still has something to reason over. Every simulated record is
            # tagged so downstream consumers can label it as such.
            ais_data_source = "real"
            if not candidates and settings.enable_ais_simulation:
                logger.warning(
                    "[ATTRIBUTION] No real AIS coverage for this region/window. "
                    "Falling back to simulated traffic."
                )
                from app.services.ais_simulator import ais_simulator
                generated = await ais_simulator.generate_for_region(
                    source_region=rec.source_region,
                    window_start=rec.release_window.start_time,
                    window_end=rec.release_window.end_time,
                )
                if generated:
                    candidates = await self.vessel_repo.find_candidates(
                        source_region=rec.source_region,
                        start_time=rec.release_window.start_time,
                        end_time=rec.release_window.end_time
                    )
                    logger.info(
                        f"[ATTRIBUTION] Candidate count after simulation = {len(candidates)}"
                    )

            # Provenance is decided by what the candidates actually are, not by
            # which query round found them -- a later /analyze run on the same
            # investigation will find previously-simulated records sitting in
            # the same collection on its *first* query, which would otherwise
            # get mislabelled "real". If every candidate is synthetic, label
            # the whole batch "simulated"; if any is real, label it "real";
            # a genuine mix is labelled "mixed" so nothing is overstated.
            if candidates:
                synthetic_flags = [getattr(c, "synthetic", False) for c in candidates]
                if all(synthetic_flags):
                    ais_data_source = "simulated"
                elif any(synthetic_flags):
                    ais_data_source = "mixed"
                else:
                    ais_data_source = "real"

            await self.inv_repo.update(investigation_id, {"ais_data_source": ais_data_source})

            # Extract bounds for diagnostic summary
            det_pts = spatial_engine.extract_coordinates(det.geometry) if det and det.geometry else []
            det_bounds = (
                f"lon=[{min(c[0] for c in det_pts):.4f}, {max(c[0] for c in det_pts):.4f}], "
                f"lat=[{min(c[1] for c in det_pts):.4f}, {max(c[1] for c in det_pts):.4f}]"
            ) if det_pts else "N/A"
            
            sr_pts = spatial_engine.extract_coordinates(rec.source_region) if rec and rec.source_region else []
            sr_bounds = (
                f"lon=[{min(c[0] for c in sr_pts):.4f}, {max(c[0] for c in sr_pts):.4f}], "
                f"lat=[{min(c[1] for c in sr_pts):.4f}, {max(c[1] for c in sr_pts):.4f}]"
            ) if sr_pts else "N/A"

            # 5. Evidence Fusion & Attribution
            stage = "EVIDENCE_FUSION"
            await self.inv_repo.update(investigation_id, {"current_stage": stage})
            if candidates:
                features = evidence_engine.generate_features(candidates, det, rec)
                ranked_candidates = attribution_engine.rank(candidates, features)
                logger.info(f"[ATTRIBUTION] Ranking completed: {len(ranked_candidates)} candidates ranked")
                
                # Persist attribution
                logger.info(f"[ATTRIBUTION] Persisting attribution...")
                attr_id = await attribution_repo.create(
                    investigation_id, 
                    [r.model_dump() for r in ranked_candidates]
                )
                logger.info(f"[ATTRIBUTION] Attribution persisted: id={attr_id}")
                candidate_ids = [c.vessel.vessel_id for c in ranked_candidates]
                await self.inv_repo.update(investigation_id, {
                    "candidate_ids": candidate_ids,
                    "attribution_id": attr_id,
                    "current_stage": "COMPLETED",
                    "status": "COMPLETED"
                })
            else:
                logger.warning(f"[ATTRIBUTION] No candidate vessels found for investigation {investigation_id}")
                attr_id = await attribution_repo.create(investigation_id, [])
                candidate_ids = []
                await self.inv_repo.update(investigation_id, {
                    "candidate_ids": [],
                    "attribution_id": attr_id,
                    "current_stage": "COMPLETED",
                    "status": "COMPLETED"
                })

            # Full diagnostic summary log
            logger.info(
                f"[ATTRIBUTION] Diagnostic summary:\n"
                f"  investigation_id={investigation_id}\n"
                f"  detection_result={det.detected} (confidence={det.confidence})\n"
                f"  detection_geometry_bounds={det_bounds}\n"
                f"  reconstruction_source_region={sr_bounds}\n"
                f"  release_window={rec.release_window.start_time} to {rec.release_window.end_time}\n"
                f"  candidates_generated={len(candidates)}\n"
                f"  candidates_ranked={len(candidate_ids)}\n"
                f"  candidate_ids={candidate_ids}\n"
                f"  attribution_id={attr_id}\n"
                f"  investigation_status=COMPLETED"
            )

            logger.info(f"[INV-{investigation_id}] Pipeline completed")

        except Exception as e:
            await self.fail_investigation(investigation_id, stage, e)

orchestrator = InvestigationOrchestrator()