from app.schemas.vessel import VesselTrack
from app.schemas.detection import Detection
from app.schemas.reconstruction import Reconstruction
from app.schemas.fusion import CandidateFeatures
from app.engines.spatial_engine import spatial_engine
from app.engines.temporal_engine import temporal_engine
import math

class EvidenceEngine:
    def __init__(self):
        pass
        
    def _calculate_ais_quality(self, track: VesselTrack) -> float:
        # Simple quality heuristic based on number of points
        count = len(track.positions)
        if count == 0:
            return 0.0
        elif count < 5:
            return 0.5
        elif count > 20:
            return 1.0
        else:
            return 0.5 + (count / 40.0)
            
    def _calculate_drift_compatibility(self, track: VesselTrack, detection: Detection) -> float:
        # Forward drift from track position.
        # For prototype, we mock this as highly correlated with spatial and temporal.
        # Real logic would call a forward drift simulation and compare with slick.
        return 0.85
        
    def _calculate_trajectory_compatibility(self, track: VesselTrack) -> float:
        # Analyze heading consistency and anomalies.
        # Mocking for prototype
        return 0.90

    def generate_features(self, candidates: list[VesselTrack], detection: Detection, reconstruction: Reconstruction) -> list[CandidateFeatures]:
        features = []
        for track in candidates:
            spatial_score = spatial_engine.score(track, reconstruction.source_region)
            temporal_score = temporal_engine.score(track, reconstruction.release_window)
            drift_score = self._calculate_drift_compatibility(track, detection)
            trajectory_score = self._calculate_trajectory_compatibility(track)
            ais_quality = self._calculate_ais_quality(track)
            
            features.append(CandidateFeatures(
                vessel_id=track.vessel_id,
                spatial_compatibility=spatial_score,
                temporal_compatibility=temporal_score,
                drift_compatibility=drift_score,
                trajectory_compatibility=trajectory_score,
                ais_quality=ais_quality
            ))
            
        return features

evidence_engine = EvidenceEngine()
