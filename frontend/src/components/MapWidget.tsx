"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SpillEntity } from '@/features/spills/domain/SpillEntity';
import { useDashboard } from '@/context/DashboardContext';

// Fix for default marker icons in Leaflet with Next.js
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

export default function MapWidget() {
  const [mounted, setMounted] = useState(false);
  const [spills, setSpills] = useState<SpillEntity[]>([]);
  const { selectedVessel } = useDashboard();

  useEffect(() => {
    setMounted(true);
    // Fetch spills from our Next.js API
    fetch('/api/spills')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const formattedSpills = data.data.map((s: any) => ({
            ...s,
            detectedAt: new Date(s.detectedAt),
            hindcastOrigin: {
              ...s.hindcastOrigin,
              estimatedTime: new Date(s.hindcastOrigin.estimatedTime)
            }
          }));
          setSpills(formattedSpills);
        }
      })
      .catch(err => console.error("Failed to fetch spills:", err));
  }, []);

  if (!mounted) return null;

  // Set map center somewhat around the area shown in the image
  const center: [number, number] = [19.0, 72.8]; 
  
  // Tactical custom icon for vessels
  const getVesselIcon = (color: string) => new L.DivIcon({
    className: 'custom-vessel-icon',
    html: `<div style="background: ${color}; width: 10px; height: 10px; transform: rotate(45deg); border: 1px solid #fff; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  // Mock all vessel tracks mapped to IMOs
  const mockVesselTracks: Record<string, { name: string; color: string; positions: [number, number][] }> = {
    '987654321': { 
      name: 'Oceanic Pride', 
      color: 'var(--accent-red)', 
      positions: [[18.5, 72.5], [18.7, 72.65], [18.8, 72.7]] 
    },
    '123456789': { 
      name: 'Sea Voyager', 
      color: 'var(--accent-orange)', 
      positions: [[19.2, 72.9], [19.1, 72.8], [18.8, 72.7]] 
    },
    '456789123': { 
      name: 'Global Trader', 
      color: 'var(--accent-yellow)', 
      positions: [[18.2, 72.2], [18.5, 72.4], [18.8, 72.7]] 
    },
    '789123456': { 
      name: 'Pacific Pearl', 
      color: 'var(--accent-green)', 
      positions: [[19.5, 72.4], [19.2, 72.5], [18.8, 72.7]] 
    },
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={center} 
        zoom={9} 
        style={{ height: '100%', width: '100%', background: '#020408' }}
        zoomControl={false} // Custom zoom controls in a real app
        attributionControl={false}
      >
        {/* Deep dark satellite style basemap */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          opacity={0.6} // Darken it by reducing opacity over the #020408 background
        />
        
        {spills.map((spill, index) => {
          const radius = Math.sqrt(spill.areaSqKm / Math.PI) * 1000;
          return (
            <React.Fragment key={spill.id}>
              {/* Tactical Slick Overlay */}
              <Circle 
                center={[spill.currentLocation.lat, spill.currentLocation.lng]} 
                radius={radius} 
                pathOptions={{ color: 'var(--accent-red)', fillColor: 'var(--accent-red)', fillOpacity: 0.2, weight: 1, dashArray: '4,4' }}
              />

              {/* Source/Origin Point */}
              <Circle 
                center={[spill.hindcastOrigin.lat, spill.hindcastOrigin.lng]} 
                radius={800} 
                pathOptions={{ color: '#fff', fillColor: '#fff', fillOpacity: 0.8, weight: 0 }}
              />

              {/* Trajectory Path */}
              <Polyline 
                positions={[
                  [spill.hindcastOrigin.lat, spill.hindcastOrigin.lng],
                  [spill.currentLocation.lat, spill.currentLocation.lng]
                ]} 
                color="var(--accent-red)" 
                weight={1} 
                dashArray="2, 6" 
              />
            </React.Fragment>
          );
        })}

        {/* Vessel Tracks - render selected one brightly, others dim, or all if none selected */}
        {Object.entries(mockVesselTracks).map(([imo, track]) => {
          const isSelected = selectedVessel === imo;
          const isFaded = selectedVessel !== null && !isSelected;
          const currentOpacity = isFaded ? 0.2 : 1.0;
          
          return (
            <React.Fragment key={imo}>
              <Polyline 
                positions={track.positions} 
                color={track.color}
                weight={isSelected ? 4 : 2} 
                dashArray="4, 4"
                opacity={currentOpacity}
              />
              <Marker 
                position={track.positions[track.positions.length - 1]} 
                icon={getVesselIcon(track.color)} 
              >
                <Popup>
                  <div style={{ color: '#000' }}>
                    <strong>{track.name}</strong><br/>
                    IMO: {imo}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Panel: DETECTED SLICK */}
      <div className="tactical-panel" style={{
        position: 'absolute',
        top: '100px',
        left: '280px',
        width: '260px',
        padding: '16px',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Detected Slick
            </div>
            <div className="tactical-text" style={{ color: 'var(--text-muted)' }}>19.1234° N, 72.9876° E</div>
          </div>
          <div style={{ width: '24px', height: '24px', border: '1px solid var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '4px', height: '4px', background: 'var(--accent-red)' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Area</span>
            <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>13.8 km²</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Confidence</span>
            <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>91%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
