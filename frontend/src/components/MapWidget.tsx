"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { InvestigationDetailResponse, Alert } from '@/lib/api/types';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

interface MapWidgetProps {
  investigationData?: InvestigationDetailResponse | null;
  selectedVessel?: string | null;
  activeAlert?: Alert | null;
}

export default function MapWidget({ investigationData, selectedVessel, activeAlert }: MapWidgetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const center: [number, number] = [19.0, 72.8]; 
  
  const getVesselIcon = (color: string, isCandidate: boolean) => new L.DivIcon({
    className: 'custom-vessel-icon',
    html: `<div style="background: ${color}; width: ${isCandidate ? 12 : 8}px; height: ${isCandidate ? 12 : 8}px; transform: rotate(45deg); border: 1px solid #fff; box-shadow: 0 0 10px ${color}; opacity: ${isCandidate ? 1 : 0.6}"></div>`,
    iconSize: isCandidate ? [12, 12] : [8, 8],
    iconAnchor: isCandidate ? [6, 6] : [4, 4]
  });

  const aisTracks = investigationData?.ais?.tracks || [];
  const candidates = investigationData?.attribution?.suspects || [];
  const candidateIds = new Set(candidates.map((c: any) => c.mmsi || c.vesselId));

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={center} 
        zoom={9} 
        style={{ height: '100%', width: '100%', background: '#020408' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          opacity={0.6}
        />
        
        {/* Render Slick Area */}
        {activeAlert && (
          <React.Fragment>
            {(() => {
              const lat = 19.05; // Mock since real drift is in investigationData
              const lon = 72.85;
              const area = activeAlert.detection?.area_pct || investigationData?.detection?.area_pct || 10;
              const radius = Math.sqrt(area / Math.PI) * 1000;
              
              const origin = investigationData?.drift?.hindcast?.estimated_origin;
              const sourceLat = origin?.lat || lat - 0.1;
              const sourceLon = origin?.lon || lon - 0.1;

              return (
                <React.Fragment>
                  {/* Current Slick */}
                  <Circle 
                    center={[lat, lon]} 
                    radius={radius} 
                    pathOptions={{ color: 'var(--accent-yellow)', fillColor: 'var(--accent-yellow)', fillOpacity: 0.3, weight: 1, dashArray: '4,4' }}
                  />
                  {/* Source Region Heatmap approximation */}
                  {investigationData && (
                    <>
                      <Circle 
                        center={[sourceLat, sourceLon]} 
                        radius={2500} 
                        pathOptions={{ color: 'rgba(239, 68, 68, 0.2)', fillColor: 'var(--accent-red)', fillOpacity: 0.2, weight: 1, dashArray: '2,4' }}
                      />
                      <Circle 
                        center={[sourceLat, sourceLon]} 
                        radius={500} 
                        pathOptions={{ color: 'var(--accent-red)', fillColor: 'var(--accent-red)', fillOpacity: 0.6, weight: 0 }}
                      />
                      {/* Backward Drift Path */}
                      <Polyline 
                        positions={investigationData?.drift?.hindcast?.track ? investigationData.drift.hindcast.track.map(p => [p.lat, p.lon] as [number, number]) : [[sourceLat, sourceLon], [lat, lon]]} 
                        color="var(--accent-yellow)" 
                        weight={2} 
                        dashArray="2, 6" 
                      />
                    </>
                  )}
                </React.Fragment>
              );
            })()}
          </React.Fragment>
        )}

        {/* Render AIS Trajectories */}
        {aisTracks.map((track: any) => {
          const isCandidate = candidateIds.has(track.mmsi) || candidateIds.has(track.vesselId) || false;
          const isSelected = selectedVessel === String(track.mmsi);
          
          let trackColor = isSelected ? 'var(--accent-red)' : isCandidate ? 'var(--accent-orange)' : 'rgba(255, 255, 255, 0.3)';
          let trackWeight = isSelected ? 3 : isCandidate ? 2 : 1;
          
          const positions: [number, number][] = track.positions.map((p: any) => [p.lat, p.lon]);
          if (positions.length === 0) return null;

          const currentPos = positions[positions.length - 1]; // Simply use last position for demo since we haven't implemented timeline scrubber interpolation yet

          return (
            <React.Fragment key={track.vesselId || track.mmsi}>
              <Polyline 
                positions={positions}
                color={trackColor}
                weight={trackWeight}
                opacity={isSelected ? 1 : isCandidate ? 0.7 : 0.4}
              />
              <Marker 
                position={currentPos} 
                icon={getVesselIcon(isSelected ? 'var(--accent-red)' : isCandidate ? 'var(--accent-orange)' : '#ffffff', isCandidate)} 
              >
                <Popup>
                  <div style={{ color: '#000', fontSize: '12px' }}>
                    <strong>{track.name || `Vessel ${track.mmsi}`}</strong><br/>
                    MMSI: {track.mmsi}<br/>
                    Type: {track.vesselType}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

      </MapContainer>

      {activeAlert && (
        <div className="tactical-panel" style={{
          position: 'absolute',
          top: '24px',
          left: '280px',
          width: '260px',
          padding: '16px',
          zIndex: 1000,
          pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-yellow)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Detected Slick
              </div>
              <div className="tactical-text" style={{ color: 'var(--text-muted)' }}>
                {activeAlert.observation_id || activeAlert._id}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Area</span>
              <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>{activeAlert.detection?.area_pct || investigationData?.detection?.area_pct || '--'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Confidence</span>
              <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>{activeAlert.detection?.confidence || investigationData?.detection?.confidence || '--'}</span>
            </div>
            {investigationData?.ais?.source && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '4px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--accent-red)', fontWeight: 600 }}>DEMO SCENARIO</span>
                <span style={{ fontSize: '10px', color: 'var(--accent-red)' }}>SIMULATED AIS</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
