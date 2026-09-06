"use client";
import React, { useState } from 'react';
import { useInvestigation } from '@/context/InvestigationContext';
import { 
  Ship, 
  AlertTriangle, 
  Crosshair, 
  Navigation, 
  Clock, 
  Wind, 
  ChevronDown, 
  ChevronUp, 
  Radio, 
  MapPin, 
  Activity, 
  FileText, 
  Layers,
  Compass
} from 'lucide-react';

export default function CandidateVesselsList() {
  const { data, selectedVessel, setSelectedVessel, setSelectedTime } = useInvestigation();
  
  // Robust candidate extraction with fallback to attribution.ranked_candidates
  const candidates: any[] = (
    data?.candidates && Array.isArray(data.candidates) && data.candidates.length > 0
      ? data.candidates
      : (data as any)?.attribution?.ranked_candidates && Array.isArray((data as any).attribution.ranked_candidates)
        ? (data as any).attribution.ranked_candidates
        : (data as any)?.ranked_candidates && Array.isArray((data as any).ranked_candidates)
          ? (data as any).ranked_candidates
          : data?.candidates || []
  );

  console.log("[CANDIDATE COMPONENT] received candidates:", candidates);
  console.log("[CANDIDATE COMPONENT] count:", candidates?.length);

  const [showAisTable, setShowAisTable] = useState<Record<string, boolean>>({});

  const toggleAisTable = (vesselId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAisTable(prev => ({ ...prev, [vesselId]: !prev[vesselId] }));
  };

  return (
    <div className="tactical-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid rgba(14, 165, 233, 0.2)', 
        background: 'rgba(15, 23, 42, 0.8)', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ship size={16} color="var(--accent-cyan, #38bdf8)" />
          </div>
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
              Culprit Vessels & Attribution
            </h3>
            <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
              Correlated with hindcast source region
            </div>
          </div>
        </div>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: candidates.length > 0 ? '#38bdf8' : '#94a3b8', 
          background: 'rgba(56, 189, 248, 0.1)', 
          padding: '4px 10px', 
          borderRadius: '4px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontFamily: 'monospace'
        }}>
          {candidates.length} CANDIDATE{candidates.length !== 1 ? 'S' : ''}
        </div>
      </div>
      
      {/* Candidate List Container */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {candidates.map((cand, i) => {
          const vessel = cand.vessel || cand;
          const vesselId = vessel?.vessel_id || cand.vessel_id || cand.mmsi || `vessel-${i}`;
          const isSelected = selectedVessel === vesselId;
          const score = cand.attribution_score ?? cand.score ?? 0;
          const threatColor = score >= 0.8 ? '#ef4444' : score >= 0.5 ? '#f59e0b' : '#38bdf8';
          const positions = vessel?.positions || cand.positions || [];
          const sortedPositions = [...positions].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const latestPos = sortedPositions.length > 0 ? sortedPositions[sortedPositions.length - 1] : null;
          const isExpanded = showAisTable[vesselId];

          // Evidence scores
          const spatial = cand.evidence?.spatial ?? cand.evidence?.spatial_score ?? 0;
          const temporal = cand.evidence?.temporal ?? cand.evidence?.temporal_score ?? 0;
          const drift = cand.evidence?.drift ?? 0;
          const trajectory = cand.evidence?.trajectory ?? cand.evidence?.trajectory_score ?? 0;
          const aisQuality = cand.evidence?.ais_quality ?? 0;

          return (
            <div 
              key={vesselId}
              onClick={() => setSelectedVessel(vesselId)}
              style={{
                background: isSelected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(15, 23, 42, 0.7)',
                border: `1.5px solid ${isSelected ? '#f97316' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: isSelected ? '0 0 20px rgba(249, 115, 22, 0.2)' : '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              {/* Card Header: Rank, Name, MMSI, Attribution Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '6px', 
                    background: 'rgba(0,0,0,0.5)', border: `1.5px solid ${threatColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 800, color: threatColor,
                    boxShadow: `0 0 10px ${threatColor}33`
                  }}>
                    #{cand.rank ?? (i + 1)}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#f97316' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {vessel?.name || cand.name || 'UNKNOWN VESSEL'}
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 600, 
                        color: 'var(--text-muted, #94a3b8)', 
                        background: 'rgba(255,255,255,0.06)', 
                        padding: '2px 6px', 
                        borderRadius: '3px',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        {vessel?.vessel_type || cand.vessel_type || 'Tanker'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '3px' }}>
                      ID: {vesselId} • MMSI: {vessel?.mmsi || cand.mmsi || 'N/A'} {(vessel?.imo || cand.imo) ? `• IMO: ${vessel?.imo || cand.imo}` : ''}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: threatColor, fontFamily: 'monospace' }}>
                    {(score * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: threatColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Attribution Score
                  </div>
                </div>
              </div>

              {/* 5 Evidence Factors Breakdown */}
              <div style={{ 
                background: 'rgba(0,0,0,0.35)', 
                borderRadius: '6px', 
                padding: '10px 12px', 
                border: '1px solid rgba(255,255,255,0.04)',
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: '8px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <Crosshair size={9} /> Spatial
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: spatial >= 0.7 ? '#ef4444' : '#f8fafc', marginTop: '2px', fontFamily: 'monospace' }}>
                    {(spatial * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <Clock size={9} /> Temporal
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: temporal >= 0.7 ? '#ef4444' : '#f8fafc', marginTop: '2px', fontFamily: 'monospace' }}>
                    {(temporal * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <Wind size={9} /> Drift
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: drift >= 0.7 ? '#ef4444' : '#f8fafc', marginTop: '2px', fontFamily: 'monospace' }}>
                    {(drift * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <Navigation size={9} /> Trajectory
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: trajectory >= 0.7 ? '#ef4444' : '#f8fafc', marginTop: '2px', fontFamily: 'monospace' }}>
                    {(trajectory * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <Radio size={9} /> AIS Quality
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: aisQuality >= 0.7 ? '#38bdf8' : '#f8fafc', marginTop: '2px', fontFamily: 'monospace' }}>
                    {(aisQuality * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Explanations (ALL explanations returned by candidate.explanations) */}
              {cand.explanations && cand.explanations.length > 0 && (
                <div style={{ 
                  background: isSelected ? 'rgba(249, 115, 22, 0.08)' : 'rgba(239, 68, 68, 0.06)', 
                  padding: '10px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${isSelected ? 'rgba(249, 115, 22, 0.25)' : 'rgba(239, 68, 68, 0.15)'}` 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <AlertTriangle size={12} color={isSelected ? '#f97316' : 'var(--accent-red, #ef4444)'} />
                    <span style={{ fontSize: '10px', color: isSelected ? '#f97316' : '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Attribution Evidence & Justification
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
                    {cand.explanations.map((exp: string, idx: number) => (
                      <li key={idx}>{exp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Selected Candidate Detailed Inspection: Complete Identity & AIS Positions */}
              {isSelected && (
                <div style={{ 
                  marginTop: '4px', 
                  paddingTop: '12px', 
                  borderTop: '1px solid rgba(255,255,255,0.08)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px' 
                }}>
                  
                  {/* Detailed Vessel Identity Grid */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={11} color="#f97316" /> Complete Vessel Registry & Telemetry
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '8px', 
                      background: 'rgba(0,0,0,0.4)', 
                      padding: '10px 12px', 
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Vessel Name: </span>
                        <strong style={{ color: '#f8fafc' }}>{vessel?.name || cand.name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Vessel ID: </span>
                        <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{vesselId || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>MMSI: </span>
                        <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{vessel?.mmsi || cand.mmsi || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>IMO Number: </span>
                        <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{vessel?.imo || cand.imo || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Vessel Type: </span>
                        <strong style={{ color: '#eab308' }}>{vessel?.vessel_type || cand.vessel_type || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Recorded Points: </span>
                        <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{positions.length} Positions</strong>
                      </div>
                      {latestPos && (
                        <>
                          <div>
                            <span style={{ color: '#64748b' }}>Latest Speed: </span>
                            <strong style={{ color: '#f8fafc' }}>{latestPos.speed !== undefined ? `${latestPos.speed.toFixed(1)} kn` : 'N/A'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Latest Heading: </span>
                            <strong style={{ color: '#f8fafc' }}>{latestPos.heading !== undefined ? `${latestPos.heading.toFixed(0)}°` : 'N/A'}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#64748b' }}>Latest Coordinates: </span>
                            <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                              {latestPos.location?.coordinates 
                                ? `${latestPos.location.coordinates[1].toFixed(5)}°N, ${latestPos.location.coordinates[0].toFixed(5)}°E`
                                : 'N/A'}
                            </strong>
                          </div>
                          {latestPos.timestamp && (
                            <div style={{ gridColumn: 'span 2' }}>
                              <span style={{ color: '#64748b' }}>Latest Ping: </span>
                              <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                                {new Date(latestPos.timestamp).toISOString().replace('T', ' ').substring(0, 19)} UTC
                              </strong>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* AIS Trajectory Track Table Toggle */}
                  <div>
                    <button
                      onClick={(e) => toggleAisTable(vesselId, e)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '4px',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Compass size={13} />
                        {isExpanded ? 'Hide Full AIS Track Points' : `View Full AIS Track (${positions.length} Points)`}
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Full AIS Positions Table */}
                    {isExpanded && (
                      <div style={{ marginTop: '8px', maxHeight: '220px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }} className="custom-scrollbar">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'monospace', textAlign: 'left' }}>
                          <thead style={{ background: 'rgba(0,0,0,0.6)', position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                              <th style={{ padding: '6px 8px' }}>#</th>
                              <th style={{ padding: '6px 8px' }}>Timestamp (UTC)</th>
                              <th style={{ padding: '6px 8px' }}>Coordinates [Lon, Lat]</th>
                              <th style={{ padding: '6px 8px' }}>Speed</th>
                              <th style={{ padding: '6px 8px' }}>Heading</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPositions.map((pos, pIdx) => {
                              const lon = pos.location?.coordinates?.[0];
                              const lat = pos.location?.coordinates?.[1];
                              const time = pos.timestamp ? new Date(pos.timestamp).toISOString().substring(11, 19) : '--';
                              return (
                                <tr 
                                  key={pIdx} 
                                  style={{ 
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    background: pIdx % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (pos.timestamp) setSelectedTime(pos.timestamp);
                                  }}
                                >
                                  <td style={{ padding: '4px 8px', color: '#64748b' }}>{pIdx + 1}</td>
                                  <td style={{ padding: '4px 8px', color: '#38bdf8' }}>{time}</td>
                                  <td style={{ padding: '4px 8px', color: '#f8fafc' }}>
                                    {lon !== undefined && lat !== undefined ? `[${lon.toFixed(4)}, ${lat.toFixed(4)}]` : 'N/A'}
                                  </td>
                                  <td style={{ padding: '4px 8px', color: '#eab308' }}>
                                    {pos.speed !== undefined ? `${pos.speed.toFixed(1)} kn` : '--'}
                                  </td>
                                  <td style={{ padding: '4px 8px', color: '#f8fafc' }}>
                                    {pos.heading !== undefined ? `${pos.heading.toFixed(0)}°` : '--'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status footer button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '10px', color: isSelected ? '#f97316' : '#64748b', fontWeight: 600 }}>
                  {isSelected ? '✓ ACTIVE SELECTION ON MAP' : 'CLICK TO TRACK ON MAP →'}
                </span>
                <span style={{ fontSize: '10px', color: '#38bdf8', fontFamily: 'monospace' }}>
                  {positions.length} AIS points
                </span>
              </div>
            </div>
          );
        })}

        {candidates.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
            <Ship size={24} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>No culprit vessels identified</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              No vessels intersected the hindcast source region during the release window.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
