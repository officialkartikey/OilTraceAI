from app.schemas.vessel import VesselTrack
from app.schemas.detection import Detection
from app.schemas.reconstruction import Reconstruction
from app.schemas.fusion import CandidateFeatures
from app.engines.spatial_engine import spatial_engine
from app.engines.temporal_engine import temporal_engine
import math
from datetime import datetime, timedelta
from typing import Optional

class EvidenceEngine:
    def __init__(self):
        pass
        
    def _calculate_ais_gap_score(self, track: VesselTrack, window_start: Optional[datetime] = None, window_end: Optional[datetime] = None) -> float:
        """
        Flags a vessel that shows a suspicious AIS transmission gap around
        the release window -- a documented evasion tactic where a vessel
        switches its transponder off before an illegal discharge and back on
        afterward. The "normal" ping cadence is estimated per-vessel (its own
        median inter-ping interval), so this adapts to whatever reporting
        density that vessel's feed actually has, rather than a fixed
        absolute threshold. Returns 0.0 (no suspicious gap) to 1.0 (a large,
        release-window-aligned gap).
        """
        positions = sorted(
            [p for p in track.positions if p.timestamp],
            key=lambda p: p.timestamp
        )
        if len(positions) < 3:
            return 0.0  # too few pings to judge a "gap" meaningfully

        def naive(t):
            return t.replace(tzinfo=None) if t.tzinfo is not None else t

        gaps = []
        for i in range(1, len(positions)):
            t0 = naive(positions[i - 1].timestamp)
            t1 = naive(positions[i].timestamp)
            gaps.append(((t1 - t0).total_seconds() / 60.0, t0, t1))

        gap_minutes_sorted = sorted(g[0] for g in gaps)
        median_gap = gap_minutes_sorted[len(gap_minutes_sorted) // 2]
        baseline = max(median_gap, 10.0)  # floor avoids over-sensitivity on very dense tracks

        w_start = w_end = None
        if window_start is not None and window_end is not None:
            w_start = naive(window_start) - timedelta(hours=1)
            w_end = naive(window_end) + timedelta(hours=1)

        worst_ratio = 0.0
        for gap_minutes, t0, t1 in gaps:
            if w_start is not None and (t1 < w_start or t0 > w_end):
                continue  # gap doesn't overlap the release window (+/- buffer)
            worst_ratio = max(worst_ratio, gap_minutes / baseline)

        # ratio <=2x normal cadence -> not suspicious; >=8x -> fully suspicious
        if worst_ratio <= 2.0:
            return 0.0
        if worst_ratio >= 8.0:
            return 1.0
        return (worst_ratio - 2.0) / 6.0

    def _calculate_ais_quality(self, track: VesselTrack, window_start: Optional[datetime] = None, window_end: Optional[datetime] = None) -> float:
        # Check AIS ping frequency within the release window if provided
        if window_start is not None and window_end is not None:
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
        else:
            # General track count heuristic fallback
            count = len(track.positions)
            if count == 0:
                return 0.0
            elif count < 5:
                return 0.5
            elif count > 20:
                return 1.0
            else:
                return 0.5 + (count / 40.0)
            
    def _calculate_drift_compatibility(self, track: VesselTrack, detection: Detection, reconstruction: Optional[Reconstruction] = None) -> float:
        # In an honest prototype, this simulates forward drift from the candidate's positions 
        # in the source region, and checks how close they get to the detected slick.
        # For the sake of this prototype, we will use the inverse of the spatial distance 
        # from the end of their track to the slick, penalized by how far off the horizon is.
        slick_lon, slick_lat = 72.85, 19.05
        if detection and detection.geometry and "coordinates" in detection.geometry:
            slick_lon, slick_lat = spatial_engine.get_centroid(detection.geometry, default_lon=72.85, default_lat=19.05)
            
        min_dist = float('inf')
        for pos in track.positions:
            if not pos.location or "coordinates" not in pos.location:
                continue
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
        
    def _calculate_trajectory_compatibility(self, track: VesselTrack, reconstruction: Optional[Reconstruction] = None) -> float:
        # Look for erratic turns (speed drops + heading changes) within the release window
        if len(track.positions) < 2:
            return 0.5

        if reconstruction and reconstruction.release_window:
            window_start = reconstruction.release_window.start_time
            window_end = reconstruction.release_window.end_time
            if window_start.tzinfo is not None:
                window_start = window_start.replace(tzinfo=None)
            if window_end.tzinfo is not None:
                window_end = window_end.replace(tzinfo=None)

            points_in_window = [p for p in track.positions if p.timestamp and
                                window_start <= p.timestamp.replace(tzinfo=None) <= window_end]
        else:
            points_in_window = track.positions
                            
        if len(points_in_window) < 2:
            return 0.5
            
        max_turn = 0
        speed_drop = 0
        
        for i in range(1, len(points_in_window)):
            prev = points_in_window[i-1]
            curr = points_in_window[i]
            
            if prev.heading is not None and curr.heading is not None:
                turn = abs(curr.heading - prev.heading)
                if turn > 180: turn = 360 - turn
                if turn > max_turn: max_turn = turn
                
            if prev.speed is not None and curr.speed is not None:
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
            ais_gap_score = self._calculate_ais_gap_score(track, reconstruction.release_window.start_time, reconstruction.release_window.end_time)

            features.append(CandidateFeatures(
                vessel_id=track.vessel_id,
                spatial_compatibility=spatial_score,
                temporal_compatibility=temporal_score,
                drift_compatibility=drift_score,
                trajectory_compatibility=trajectory_score,
                ais_quality=ais_quality,
                ais_gap_score=ais_gap_score
            ))
            
        return features

evidence_engine = EvidenceEngine()