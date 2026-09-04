from app.schemas.vessel import VesselTrack
from app.schemas.detection import Detection
from app.schemas.reconstruction import Reconstruction
from app.schemas.fusion import CandidateFeatures
from app.engines.spatial_engine import spatial_engine
from app.engines.temporal_engine import temporal_engine
import math
from datetime import datetime

class EvidenceEngine:
    def __init__(self):
        pass
        
    def _calculate_ais_quality(self, track: VesselTrack, window_start: datetime, window_end: datetime) -> float:
        # Check AIS ping frequency within the release window
        if window_start.tzinfo is not None:
            window_start = window_start.replace(tzinfo=None)
        if window_end.tzinfo is not None:
            window_end = window_end.replace(tzinfo=None)
            
        points_in_window = [p for p in track.positions if p.timestamp and 
                            window_start <= p.timestamp.replace(tzinfo=None) <= window_end]
                            
        count = len(points_in_window)
        if count == 0:
            return 0.1 # Very low quality if no points in critical window
        elif count >= 4:
            return 1.0 # High quality if enough points
        else:
            return 0.5 + (count * 0.1)
            
    def _calculate_drift_compatibility(self, track: VesselTrack, detection: Detection, reconstruction: Reconstruction) -> float:
        # In an honest prototype, this simulates forward drift from the candidate's positions 
        # in the source region, and checks how close they get to the detected slick.
        # For the sake of this prototype, we will use the inverse of the spatial distance 
        # from the end of their track to the slick, penalized by how far off the horizon is.
        slick_lon, slick_lat = 72.85, 19.05
        if detection.geometry and "coordinates" in detection.geometry:
            coords = detection.geometry["coordinates"][0] if detection.geometry["type"] == "Polygon" else detection.geometry["coordinates"][0][0]
            slick_lon = sum([c[0] for c in coords]) / len(coords)
            slick_lat = sum([c[1] for c in coords]) / len(coords)
            
        min_dist = float('inf')
        for pos in track.positions:
            pos_lon, pos_lat = pos.location["coordinates"]
            dist = spatial_engine.haversine(pos_lon, pos_lat, slick_lon, slick_lat)
            if dist < min_dist:
                min_dist = dist
                
        # Normalize: distance of <5km -> 1.0 score, distance > 30km -> 0.0
        if min_dist < 5.0:
            return 1.0
        elif min_dist > 30.0:
            return 0.0
        else:
            return 1.0 - ((min_dist - 5.0) / 25.0)
        
    def _calculate_trajectory_compatibility(self, track: VesselTrack, reconstruction: Reconstruction) -> float:
        # Look for erratic turns (speed drops + heading changes) within the release window
        if len(track.positions) < 3:
            return 0.5
            
        window_start = reconstruction.release_window.start_time.replace(tzinfo=None)
        window_end = reconstruction.release_window.end_time.replace(tzinfo=None)
        
        points_in_window = [p for p in track.positions if p.timestamp and 
                            window_start <= p.timestamp.replace(tzinfo=None) <= window_end]
                            
        if len(points_in_window) < 2:
            return 0.5
            
        max_turn = 0
        speed_drop = 0
        
        for i in range(1, len(points_in_window)):
            prev = points_in_window[i-1]
            curr = points_in_window[i]
            
            if prev.heading and curr.heading:
                turn = abs(curr.heading - prev.heading)
                if turn > 180: turn = 360 - turn
                if turn > max_turn: max_turn = turn
                
            if prev.speed and curr.speed:
                drop = prev.speed - curr.speed
                if drop > speed_drop: speed_drop = drop
            
        # Normalize: large turns (e.g. > 45 deg) + speed drops increase score (indicates maneuvering/dumping)
        score = min(1.0, (max_turn / 45.0) * 0.7 + (speed_drop / 10.0) * 0.3)
        return max(0.0, score)

    def generate_features(self, candidates: list[VesselTrack], detection: Detection, reconstruction: Reconstruction) -> list[CandidateFeatures]:
        features = []
        for track in candidates:
            spatial_score = spatial_engine.score(track, reconstruction.source_region)
            temporal_score = temporal_engine.score(track, reconstruction.release_window)
            drift_score = self._calculate_drift_compatibility(track, detection, reconstruction)
            trajectory_score = self._calculate_trajectory_compatibility(track, reconstruction)
            ais_quality = self._calculate_ais_quality(track, reconstruction.release_window.start_time, reconstruction.release_window.end_time)
            
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
