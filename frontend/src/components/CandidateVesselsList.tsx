"use client";
import React from 'react';
import { useInvestigation } from '@/context/InvestigationContext';
import { Ship, AlertTriangle, Crosshair, Navigation, Clock } from 'lucide-react';

export default function CandidateVesselsList() {
  const { data, selectedVessel, setSelectedVessel } = useInvestigation();
  const candidates = data?.candidates || [];

  return (
    <div className="tactical-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(14, 165, 233, 0.1)', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Ship size={16} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AIS Candidates</h3>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          {candidates.length} FOUND
        </div>
      </div>
      
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {candidates.map((cand, i) => {
          const isSelected = selectedVessel === cand.vessel.vessel_id;
          const score = cand.attribution_score;
          const threatColor = score > 0.8 ? 'var(--accent-red)' : score > 0.5 ? 'var(--accent-yellow)' : 'var(--text-secondary)';
          
          return (
            <div 
              key={cand.vessel.vessel_id}
              onClick={() => setSelectedVessel(cand.vessel.vessel_id)}
              style={{
                background: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '6px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ 
                    width: '24px', height: '24px', borderRadius: '4px', 
                    background: 'rgba(0,0,0,0.4)', border: `1px solid ${threatColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: threatColor
                  }}>
                    {cand.rank}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{cand.vessel.name || 'UNKNOWN'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>MMSI: {cand.vessel.mmsi}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: threatColor }}>
                    {(score * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Match</div>
                </div>
              </div>
              
              {isSelected && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Evidence Scores */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Crosshair size={10}/> Spatial</span>
                      <span style={{ color: cand.evidence?.spatial_score > 0.7 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        {((cand.evidence?.spatial_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10}/> Temporal</span>
                      <span style={{ color: cand.evidence?.temporal_score > 0.7 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        {((cand.evidence?.temporal_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={10}/> Trajectory</span>
                      <span style={{ color: cand.evidence?.trajectory_score > 0.7 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        {((cand.evidence?.trajectory_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Explanations */}
                  {cand.explanations && cand.explanations.length > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <AlertTriangle size={10} color="var(--accent-red)" />
                        <span style={{ fontSize: '9px', color: 'var(--accent-red)', fontWeight: 600, textTransform: 'uppercase' }}>Evidence Fusion</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '12px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {cand.explanations.map((exp, idx) => <li key={idx}>{exp}</li>)}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
        {candidates.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            No candidates matched the reconstruction window.
          </div>
        )}
      </div>
    </div>
  );
}
