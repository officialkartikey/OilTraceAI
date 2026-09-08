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
import { processVesselTrajectory, extractPosLatLng } from '@/lib/trajectory';

export default function CandidateVesselsList() {
  const { data, selectedVessel, setSelectedVessel, setSelectedTime } = useInvestigation();

  // Reference center from reconstruction source region or detection
  const referenceCenter = React.useMemo((): [number, number] | null => {
    const rec = data?.reconstruction;
    if (rec?.source_region?.coordinates) {
      const pts: [number, number][] = [];
      const recurse = (c: any) => {
        if (!c) return;
        if (Array.isArray(c)) {
          if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
            pts.push([c[1], c[0]]); // [lat, lon]
          } else {
            c.forEach(recurse);
          }
        }
      };
      recurse(rec.source_region.coordinates);
      if (pts.length > 0) {
        const sumLat = pts.reduce((acc, p) => acc + p[0], 0);
        const sumLon = pts.reduce((acc, p) => acc + p[1], 0);
        return [sumLat / pts.length, sumLon / pts.length];
      }
    }
    const det = data?.detection;
    if (det?.geometry?.coordinates) {
      const pts: [number, number][] = [];
      const recurse = (c: any) => {
        if (!c) return;
        if (Array.isArray(c)) {
          if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
            pts.push([c[1], c[0]]);
          } else {
            c.forEach(recurse);
          }
        }
      };
      recurse(det.geometry.coordinates);
      if (pts.length > 0) {
        const sumLat = pts.reduce((acc, p) => acc + p[0], 0);
        const sumLon = pts.reduce((acc, p) => acc + p[1], 0);
        return [sumLat / pts.length, sumLon / pts.length];
      }
    }
    return null;
  }, [data]);
  
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
        borderBottom: '1px solid var(--border-color)', 
        background: 'var(--header-bg)', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ship size={16} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
              Culprit Vessels & Attribution
            </h3>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Correlated with hindcast source region
            </div>
          </div>
        </div>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: candidates.length > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', 
          background: 'rgba(14, 165, 233, 0.1)', 
          padding: '4px 10px', 
          borderRadius: '4px',
          border: '1px solid rgba(14, 165, 233, 0.25)',
          fontFamily: 'var(--font-mono)'
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
          const threatColor = score >= 0.8 ? '#ef4444' : score >= 0.5 ? '#f59e0b' : 'var(--accent-blue)';
          const cleanedTrack = processVesselTrajectory(cand, referenceCenter, cand.rank || (i + 1));
          const cleanedPositions = cleanedTrack.cleanedPositions;
          const latestPos = cleanedTrack.latestPos;
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
                background: isSelected ? 'var(--candidate-selected-bg)' : 'var(--candidate-card-bg)',
                border: `1.5px solid ${isSelected ? 'var(--candidate-selected-border)' : 'var(--candidate-card-border)'}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: isSelected ? '0 0 16px var(--candidate-selected-glow)' : 'var(--shadow-sm)'
              }}
            >
              {/* Card Header: Rank, Name, MMSI, Attribution Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '6px', 
                    background: isSelected ? 'rgba(234, 88, 12, 0.12)' : 'var(--button-ghost-hover)', 
                    border: `1.5px solid ${threatColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 800, color: threatColor,
                    boxShadow: isSelected ? '0 0 8px rgba(234, 88, 12, 0.2)' : 'none'
                  }}>
                    #{cand.rank ?? (i + 1)}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {vessel?.name || cand.name || 'UNKNOWN VESSEL'}
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)', 
                        background: 'var(--table-header-bg)', 
                        padding: '2px 6px', 
                        borderRadius: '3px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {vessel?.vessel_type || cand.vessel_type || 'Tanker'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                      ID: <span style={{ color: 'var(--telemetry-value-highlight)', fontWeight: 600 }}>{vesselId}</span> • MMSI: <span style={{ color: 'var(--text-secondary)' }}>{vessel?.mmsi || cand.mmsi || 'N/A'}</span> {(vessel?.imo || cand.imo) ? `• IMO: ${vessel?.imo || cand.imo}` : ''}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: threatColor, fontFamily: 'var(--font-mono)' }}>
                    {(score * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: isSelected ? 'var(--candidate-selected-border)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Attribution Score
                  </div>
                </div>
              </div>

              {/* 5 Evidence Factors Breakdown */}
              <div style={{ 
                background: 'var(--telemetry-box-bg)', 
                borderRadius: '6px', 
                padding: '10px 12px', 
                border: '1px solid var(--telemetry-box-border)',
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: '8px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--telemetry-label)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontWeight: 600 }}>
                    <Crosshair size={9} /> Spatial
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: spatial >= 0.7 ? 'var(--accent-red)' : 'var(--telemetry-value)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {(spatial * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: 'var(--telemetry-label)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontWeight: 600 }}>
                    <Clock size={9} /> Temporal
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: temporal >= 0.7 ? 'var(--accent-red)' : 'var(--telemetry-value)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {(temporal * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: 'var(--telemetry-label)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontWeight: 600 }}>
                    <Wind size={9} /> Drift
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: drift >= 0.7 ? 'var(--accent-red)' : 'var(--telemetry-value)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {(drift * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: 'var(--telemetry-label)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontWeight: 600 }}>
                    <Navigation size={9} /> Trajectory
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: trajectory >= 0.7 ? 'var(--accent-red)' : 'var(--telemetry-value)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {(trajectory * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9px', color: 'var(--telemetry-label)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontWeight: 600 }}>
                    <Radio size={9} /> AIS Quality
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: aisQuality >= 0.7 ? 'var(--accent-green)' : 'var(--telemetry-value)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {(aisQuality * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Explanations (ALL explanations returned by candidate.explanations) */}
              {cand.explanations && cand.explanations.length > 0 && (
                <div style={{ 
                  background: 'var(--evidence-box-bg)', 
                  padding: '11px 13px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--evidence-box-border)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
                    <AlertTriangle size={13} color="var(--evidence-box-heading)" />
                    <span style={{ fontSize: '10px', color: 'var(--evidence-box-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Attribution Evidence & Justification
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--evidence-box-text)', display: 'flex', flexDirection: 'column', gap: '5px', lineHeight: '1.45', fontWeight: 500 }}>
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
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={11} color="var(--accent-orange)" /> Complete Vessel Registry & Telemetry
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '8px', 
                      background: 'var(--telemetry-box-bg)', 
                      padding: '11px 13px', 
                      borderRadius: '6px',
                      fontSize: '11px',
                      border: '1px solid var(--telemetry-box-border)'
                    }}>
                      <div>
                        <span style={{ color: 'var(--telemetry-label)' }}>Vessel Name: </span>
                        <strong style={{ color: 'var(--telemetry-value)' }}>{vessel?.name || cand.name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--telemetry-label)' }}>Vessel ID: </span>
                        <strong style={{ color: 'var(--telemetry-value-highlight)', fontFamily: 'var(--font-mono)' }}>{vesselId || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--telemetry-label)' }}>MMSI: </span>
                        <strong style={{ color: 'var(--telemetry-value)', fontFamily: 'var(--font-mono)' }}>{vessel?.mmsi || cand.mmsi || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--telemetry-label)' }}>IMO Number: </span>
                        <strong style={{ color: 'var(--telemetry-value)', fontFamily: 'var(--font-mono)' }}>{vessel?.imo || cand.imo || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--telemetry-label)' }}>Vessel Type: </span>
                        <strong style={{ color: 'var(--accent-yellow)' }}>{vessel?.vessel_type || cand.vessel_type || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--telemetry-label)' }}>Recorded Points: </span>
                        <strong style={{ color: 'var(--telemetry-value-highlight)', fontFamily: 'var(--font-mono)' }}>{cleanedPositions.length} Positions</strong>
                      </div>
                      {latestPos && (
                        <>
                          <div>
                            <span style={{ color: 'var(--telemetry-label)' }}>Latest Speed: </span>
                            <strong style={{ color: 'var(--telemetry-value)' }}>{latestPos.speed !== undefined ? `${latestPos.speed.toFixed(1)} kn` : 'N/A'}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--telemetry-label)' }}>Latest Heading: </span>
                            <strong style={{ color: 'var(--telemetry-value)' }}>{latestPos.heading !== undefined ? `${latestPos.heading.toFixed(0)}°` : 'N/A'}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: 'var(--telemetry-label)' }}>Latest Coordinates: </span>
                            <strong style={{ color: 'var(--telemetry-value-highlight)', fontFamily: 'var(--font-mono)' }}>
                              {cleanedTrack.latestLatLng 
                                ? `${cleanedTrack.latestLatLng[0].toFixed(5)}°N, ${cleanedTrack.latestLatLng[1].toFixed(5)}°E`
                                : latestPos.location?.coordinates 
                                ? `${latestPos.location.coordinates[1].toFixed(5)}°N, ${latestPos.location.coordinates[0].toFixed(5)}°E`
                                : 'N/A'}
                            </strong>
                          </div>
                          {latestPos.timestamp && (
                            <div style={{ gridColumn: 'span 2' }}>
                              <span style={{ color: 'var(--telemetry-label)' }}>Latest Ping: </span>
                              <strong style={{ color: 'var(--telemetry-value)', fontFamily: 'var(--font-mono)' }}>
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
                        background: 'var(--telemetry-box-bg)',
                        border: '1px solid var(--telemetry-box-border)',
                        borderRadius: '4px',
                        color: 'var(--telemetry-value-highlight)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-highlight)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'var(--telemetry-box-border)';
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Compass size={13} />
                        {isExpanded ? 'Hide Full AIS Track Points' : `View Full AIS Track (${cleanedPositions.length} Points)`}
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Full AIS Positions Table */}
                    {isExpanded && (
                      <div style={{ marginTop: '8px', maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }} className="custom-scrollbar">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'var(--font-mono)', textAlign: 'left' }}>
                          <thead style={{ background: 'var(--table-header-bg)', position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '6px 8px', fontWeight: 600 }}>#</th>
                              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Timestamp (UTC)</th>
                              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Coordinates [Lon, Lat]</th>
                              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Speed</th>
                              <th style={{ padding: '6px 8px', fontWeight: 600 }}>Heading</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cleanedPositions.map((pos, pIdx) => {
                              const latLon = extractPosLatLng(pos);
                              const lat = latLon ? latLon[0] : pos.location?.coordinates?.[1];
                              const lon = latLon ? latLon[1] : pos.location?.coordinates?.[0];
                              const time = pos.timestamp ? new Date(pos.timestamp).toISOString().substring(11, 19) : '--';
                              return (
                                <tr 
                                  key={pIdx} 
                                  style={{ 
                                    borderBottom: '1px solid var(--border-subtle)',
                                    background: pIdx % 2 === 0 ? 'var(--table-row-alt)' : 'transparent',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (pos.timestamp) setSelectedTime(pos.timestamp);
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--table-row-hover)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = pIdx % 2 === 0 ? 'var(--table-row-alt)' : 'transparent';
                                  }}
                                >
                                  <td style={{ padding: '5px 8px', color: 'var(--text-muted)' }}>{pIdx + 1}</td>
                                  <td style={{ padding: '5px 8px', color: 'var(--telemetry-value-highlight)', fontWeight: 600 }}>{time}</td>
                                  <td style={{ padding: '5px 8px', color: 'var(--text-primary)' }}>
                                    {lon !== undefined && lat !== undefined ? `[${lon.toFixed(4)}, ${lat.toFixed(4)}]` : 'N/A'}
                                  </td>
                                  <td style={{ padding: '5px 8px', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                                    {pos.speed !== undefined ? `${pos.speed.toFixed(1)} kn` : '--'}
                                  </td>
                                  <td style={{ padding: '5px 8px', color: 'var(--text-primary)' }}>
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
                <span style={{ fontSize: '10px', color: isSelected ? 'var(--accent-orange)' : 'var(--telemetry-label)', fontWeight: 700 }}>
                  {isSelected ? '✓ ACTIVE SELECTION ON MAP' : 'CLICK TO TRACK ON MAP →'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--telemetry-value-highlight)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {cleanedPositions.length} AIS points
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
