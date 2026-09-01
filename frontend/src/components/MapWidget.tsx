"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Marker, Popup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useInvestigation } from '@/context/InvestigationContext';

import { useMap } from 'react-leaflet';

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

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 9, { animate: true });
  }, [center, map]);
  return null;
}

export default function MapWidget() {
  const [mounted, setMounted] = useState(false);
  const { data, selectedVessel, mapLayers } = useInvestigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const candidates = data?.candidates || [];
  const rec = data?.reconstruction;
  const det = data?.detection;
  const obs = data?.observation;

  // Center around Observation if available, else Mumbai
  let center: [number, number] = [19.0, 72.8]; 
  
  if (obs && obs.geospatial_bounds && obs.geospatial_bounds.coordinates && obs.geospatial_bounds.coordinates.length > 0) {
      const firstRing = obs.geospatial_bounds.coordinates[0];
      const validPoints = firstRing.filter((c: any) => typeof c[1] === 'number' && typeof c[0] === 'number');
      if (validPoints.length > 0) {
          const lat = validPoints.reduce((sum: number, c: any) => sum + c[1], 0) / validPoints.length;
          const lon = validPoints.reduce((sum: number, c: any) => sum + c[0], 0) / validPoints.length;
          center = [lat, lon];
      }
  }
  
  const getVesselIcon = (color: string, isSelected: boolean) => new L.DivIcon({
    className: 'custom-vessel-icon',
    html: `<div style="background: ${color}; width: ${isSelected ? 16 : 10}px; height: ${isSelected ? 16 : 10}px; transform: rotate(45deg); border: 1px solid #fff; box-shadow: 0 0 10px ${color}; opacity: ${isSelected ? 1 : 0.8}"></div>`,
    iconSize: isSelected ? [16, 16] : [10, 10],
    iconAnchor: isSelected ? [8, 8] : [5, 5]
  });

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={center} 
        zoom={9} 
        style={{ height: '100%', width: '100%', background: '#020408' }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapUpdater center={center} />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          opacity={0.6}
        />
        
        {/* Render Observation / Slick Area */}
        {mapLayers.showSlick && obs && det && (
          <React.Fragment>
            {(() => {
              let slickLat = center[0];
              let slickLon = center[1];
              
              if (det.geometry && det.geometry.coordinates && det.geometry.coordinates.length > 0) {
                 const firstRing = det.geometry.coordinates[0];
                 const validPoints = firstRing.filter((c: any) => typeof c[1] === 'number' && typeof c[0] === 'number');
                 if (validPoints.length > 0) {
                     slickLat = validPoints.reduce((sum: number, c: any) => sum + c[1], 0) / validPoints.length;
                     slickLon = validPoints.reduce((sum: number, c: any) => sum + c[0], 0) / validPoints.length;
                     
                     const lPositions = validPoints.map((c: any) => [c[1], c[0]]);
                     return (
                         <Polygon 
                            positions={lPositions} 
                            pathOptions={{ color: 'var(--accent-yellow)', fillColor: 'var(--accent-yellow)', fillOpacity: 0.3, weight: 2 }}
                         />
                     );
                 }
              }

              // Fallback to circle
              const area = det.area_km2 || 10;
              const radius = Math.sqrt(area / Math.PI) * 1000;
              return (
                  <Circle 
                    center={[slickLat, slickLon]} 
                    radius={radius} 
                    pathOptions={{ color: 'var(--accent-yellow)', fillColor: 'var(--accent-yellow)', fillOpacity: 0.3, weight: 1, dashArray: '4,4' }}
                  />
              );
            })()}
          </React.Fragment>
        )}

        {/* Render Source Region */}
        {mapLayers.showSourceRegion && rec && rec.source_region && (
           <React.Fragment>
            {(() => {
                if (rec.source_region.coordinates && rec.source_region.coordinates.length > 0) {
                     const firstRing = rec.source_region.coordinates[0];
                     const validPoints = firstRing.filter((c: any) => typeof c[1] === 'number' && typeof c[0] === 'number');
                     if (validPoints.length > 0) {
                         const lPositions = validPoints.map((c: any) => [c[1], c[0]]);
                         return (
                             <Polygon 
                                positions={lPositions} 
                                pathOptions={{ color: 'var(--accent-red)', fillColor: 'var(--accent-red)', fillOpacity: 0.2, weight: 1, dashArray: '2,4' }}
                             />
                         );
                     }
                }
                return null;
            })()}
           </React.Fragment>
        )}

        {/* Render Candidates */}
        {mapLayers.showTracks && candidates.map((cand: any) => {
          const isSelected = selectedVessel === cand.vessel.vessel_id;
          const score = cand.attribution_score;
          
          let trackColor = isSelected ? 'var(--accent-red)' : score > 0.8 ? 'var(--accent-orange)' : 'rgba(255, 255, 255, 0.4)';
          let trackWeight = isSelected ? 3 : 2;
          
          const positions = cand.vessel.positions || [];
          
          if (positions.length > 0) {
              const polylinePositions = positions.map((p: any) => [p.location.coordinates[1], p.location.coordinates[0]]);
              const latestPos = polylinePositions[polylinePositions.length - 1];

              return (
                <React.Fragment key={cand.vessel.vessel_id}>
                    <Polyline 
                        positions={polylinePositions} 
                        pathOptions={{ color: trackColor, weight: trackWeight, opacity: isSelected ? 1 : 0.6 }} 
                    />
                    <Marker 
                        position={latestPos} 
                        icon={getVesselIcon(trackColor, isSelected)} 
                    >
                        <Popup>
                            <div style={{ color: '#000', fontSize: '12px' }}>
                            <strong>{cand.vessel.name || `UNKNOWN`}</strong><br/>
                            MMSI: {cand.vessel.mmsi}<br/>
                            Match Score: {(cand.attribution_score * 100).toFixed(0)}%
                            </div>
                        </Popup>
                    </Marker>
                </React.Fragment>
              );
          } else {
              // Fallback static positions
              const latJitter = (Math.random() - 0.5) * 0.1;
              const lonJitter = (Math.random() - 0.5) * 0.1;
              const mockPos: [number, number] = [center[0] - 0.1 + latJitter, center[1] - 0.1 + lonJitter];
              return (
                <Marker 
                    key={cand.vessel.vessel_id}
                    position={mockPos} 
                    icon={getVesselIcon(trackColor, isSelected)} 
                >
                    <Popup>
                        <div style={{ color: '#000', fontSize: '12px' }}>
                        <strong>{cand.vessel.name || `UNKNOWN`}</strong><br/>
                        MMSI: {cand.vessel.mmsi}<br/>
                        Match Score: {(cand.attribution_score * 100).toFixed(0)}%
                        </div>
                    </Popup>
                </Marker>
              );
          }
        })}
      </MapContainer>
    </div>
  );
}
