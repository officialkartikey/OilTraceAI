from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from app.schemas.vessel import VesselTrack

class CandidateFeatures(BaseModel):
    vessel_id: str
    spatial_compatibility: float
    temporal_compatibility: float
    drift_compatibility: float
    trajectory_compatibility: float
    ais_quality: float
    ais_gap_score: float = 0.0

class EvidenceScore(BaseModel):
    spatial: float
    temporal: float
    drift: float
    trajectory: float
    ais_quality: float
    ais_gap: float = 0.0

class RankedCandidate(BaseModel):
    rank: int
    vessel: VesselTrack
    attribution_score: float
    evidence: EvidenceScore
    explanations: List[str] = []

class InvestigationResult(BaseModel):
    investigation_id: str
    ranked_candidates: List[RankedCandidate]