from app.schemas.vessel import VesselTrack
from app.schemas.reconstruction import TimeWindow

class TemporalEngine:
    def __init__(self):
        pass

    def score(self, track: VesselTrack, release_window: TimeWindow) -> float:
        """
        Calculate temporal compatibility: accurate overlap with release window.
        """
        if not track.positions:
            return 0.0
            
        # Filter positions to only those with valid timestamps
        valid_positions = [p for p in track.positions if p.timestamp]
        if not valid_positions:
            return 0.0

        track_start = valid_positions[0].timestamp
        track_end = valid_positions[-1].timestamp
        
        if track_start.tzinfo is not None:
            track_start = track_start.replace(tzinfo=None)
        if track_end.tzinfo is not None:
            track_end = track_end.replace(tzinfo=None)
            
        window_start = release_window.start_time
        window_end = release_window.end_time
        if window_start.tzinfo is not None:
            window_start = window_start.replace(tzinfo=None)
        if window_end.tzinfo is not None:
            window_end = window_end.replace(tzinfo=None)

        overlap_start = max(track_start, window_start)
        overlap_end = min(track_end, window_end)
        
        if overlap_start > overlap_end:
            # No overlap
            time_diff = min(abs((track_start - window_end).total_seconds()), 
                            abs((window_start - track_end).total_seconds()))
            # Decay score if within 1 hour, otherwise 0
            if time_diff < 3600:
                return max(0.0, 1.0 - (time_diff / 3600.0))
            return 0.0
            
        overlap_duration = (overlap_end - overlap_start).total_seconds()
        window_duration = (window_end - window_start).total_seconds()
        
        if window_duration <= 0:
            return 1.0
            
        score = overlap_duration / window_duration
        return min(1.0, score + 0.3) # Bonus for partial overlap

temporal_engine = TemporalEngine()
