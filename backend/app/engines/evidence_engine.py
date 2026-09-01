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
        # Pseudo-forward drift calculation: calculate distance between track positions and detection geometry.
        # In a real model, we would drift the vessel's positions forward using wind/current.
        slick_lon, slick_lat = 72.85, 19.05
        if detection.geometry and "coordinates" in detection.geometry:
            coords = detection.geometry["coordinates"][0]
            slick_lon = sum([c[0] for c in coords]) / len(coords)
            slick_lat = sum([c[1] for c in coords]) / len(coords)
            
        min_dist = float('inf')
        for pos in track.positions:
            pos_lon, pos_lat = pos.location["coordinates"]
            # Rough distance in degrees
            dist = math.sqrt((pos_lon - slick_lon)**2 + (pos_lat - slick_lat)**2)
            if dist < min_dist:
                min_dist = dist
                
        # Normalize: distance of 0 -> 1.0 score, distance of 0.5 degrees -> 0.0 score
        score = 1.0 - (min_dist / 0.5)
        return max(0.0, min(1.0, score))
        
    def _calculate_trajectory_compatibility(self, track: VesselTrack) -> float:
        # Analyze heading consistency and anomalies.
        # Check if the vessel made sudden erratic turns.
        if len(track.positions) < 2:
            return 0.5
            
        max_turn = 0
        for i in range(1, len(track.positions)):
            prev_h = track.positions[i-1].heading or 0
            curr_h = track.positions[i].heading or 0
            turn = abs(curr_h - prev_h)
            if turn > 180: turn = 360 - turn
            if turn > max_turn: max_turn = turn
            
        # Normalize: turn of 0 -> 1.0, turn of 90 -> 0.0
        score = 1.0 - (max_turn / 90.0)
        return max(0.0, min(1.0, score))

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
