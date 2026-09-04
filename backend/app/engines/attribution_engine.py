from app.schemas.fusion import CandidateFeatures, RankedCandidate, EvidenceScore
from app.schemas.vessel import VesselTrack

class AttributionEngine:
    def __init__(self):
        # Weights for prototype heuristic
        self.weights = {
            "spatial": 0.30,
            "temporal": 0.25,
            "drift": 0.20,
            "trajectory": 0.15,
            "ais_quality": 0.10
        }

    def _generate_explanations(self, features: CandidateFeatures) -> list[str]:
        explanations = []
        if features.spatial_compatibility > 0.8:
            explanations.append("Vessel trajectory directly intersected the inner bounds of the hindcast source region.")
        elif features.spatial_compatibility < 0.3:
            explanations.append("Vessel remained far outside the calculated uncertainty bounds of the source region.")
            
        if features.temporal_compatibility > 0.8:
            explanations.append("Vessel was physically present during the precise calculated release time window.")
            
        if features.drift_compatibility > 0.7:
            explanations.append("Forward drift from candidate location strongly aligns with the observed slick coordinates.")
            
        if features.trajectory_compatibility > 0.6:
            explanations.append("Vessel exhibited significant course changes or speed drops typical of operational discharges.")
            
        if features.ais_quality < 0.5:
            explanations.append("AIS coverage during the critical release window was sparse or fragmented.")
            
        return explanations

    def rank(self, candidates: list[VesselTrack], features: list[CandidateFeatures]) -> list[RankedCandidate]:
        feature_map = {f.vessel_id: f for f in features}
        
        ranked = []
        for track in candidates:
            feat = feature_map.get(track.vessel_id)
            if not feat:
                continue
                
            score = (
                feat.spatial_compatibility * self.weights["spatial"] +
                feat.temporal_compatibility * self.weights["temporal"] +
                feat.drift_compatibility * self.weights["drift"] +
                feat.trajectory_compatibility * self.weights["trajectory"] +
                feat.ais_quality * self.weights["ais_quality"]
            )
            
            evidence = EvidenceScore(
                spatial=feat.spatial_compatibility,
                temporal=feat.temporal_compatibility,
                drift=feat.drift_compatibility,
                trajectory=feat.trajectory_compatibility,
                ais_quality=feat.ais_quality
            )
            
            explanations = self._generate_explanations(feat)
            
            ranked.append({
                "vessel": track,
                "attribution_score": round(score, 3),
                "evidence": evidence,
                "explanations": explanations
            })
            
        # Sort by score descending
        ranked.sort(key=lambda x: x["attribution_score"], reverse=True)
        
        # Add rank
        final_ranked = []
        for idx, item in enumerate(ranked):
            final_ranked.append(RankedCandidate(
                rank=idx + 1,
                vessel=item["vessel"],
                attribution_score=item["attribution_score"],
                evidence=item["evidence"],
                explanations=item["explanations"]
            ))
            
        return final_ranked

attribution_engine = AttributionEngine()
