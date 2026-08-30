from app.schemas.vessel import VesselTrack
from app.schemas.reconstruction import TimeWindow

class TemporalEngine:
    def __init__(self):
        pass

    def score(self, track: VesselTrack, release_window: TimeWindow) -> float:
        """
        Calculate temporal compatibility: overlap with release window.
        """
        if not track.positions:
            return 0.0
            
        track_start = track.positions[0].timestamp
        track_end = track.positions[-1].timestamp
        
        # Calculate overlap
        overlap_start = max(track_start, release_window.start_time)
        overlap_end = min(track_end, release_window.end_time)
        
        if overlap_start > overlap_end:
            # No overlap
            # Assign partial score if it's very close in time (e.g. within 30 mins)
            time_diff = min(abs((track_start - release_window.end_time).total_seconds()), 
                            abs((release_window.start_time - track_end).total_seconds()))
            if time_diff < 1800: # 30 mins
                return 1.0 - (time_diff / 1800.0)
            return 0.0
            
        overlap_duration = (overlap_end - overlap_start).total_seconds()
        window_duration = (release_window.end_time - release_window.start_time).total_seconds()
        
        # If it overlaps for the full window, score is 1.0
        # If partial overlap, score by percentage
        if window_duration > 0:
            score = overlap_duration / window_duration
            return min(1.0, score + 0.5) # Boost score if there is any overlap
        
        return 1.0

temporal_engine = TemporalEngine()
