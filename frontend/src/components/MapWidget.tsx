"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useInvestigation } from '@/context/InvestigationContext';
import { Radio, Wind, Compass, Layers } from 'lucide-react';

interface MapWidgetProps {
  activeAlert?: any;
  className?: string;
  showVesselTracks?: boolean;
  [key: string]: any;
}

// Haversine distance in kilometers
function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Recursively extract all [lon, lat] pairs from any GeoJSON geometry
function extractCoordinates(coords: any): [number, number][] {
  const points: [number, number][] = [];
  function recurse(c: any) {
    if (!c) return;
    if (Array.isArray(c)) {
      if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
        points.push([c[0], c[1]]);
      } else {
        c.forEach(recurse);
      }
    }
  }
  recurse(coords);
  return points;
}

// Convert GeoJSON coordinates to Leaflet [lat, lon][] rings
function extractLeafletPolygons(geometry: any): [number, number][][] {
  if (!geometry || !geometry.coordinates) return [];
  const rings: [number, number][][] = [];

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring: any[]) => {
      const valid = ring
        .filter(pt => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number')
        .map(pt => [pt[1], pt[0]] as [number, number]);
      if (valid.length > 2) rings.push(valid);
    });
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon: any[]) => {
      polygon.forEach((ring: any[]) => {
        const valid = ring
          .filter(pt => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number')
          .map(pt => [pt[1], pt[0]] as [number, number]);
        if (valid.length > 2) rings.push(valid);
      });
    });
  }
  return rings;
}

function MapViewController({
  center,
  bounds,
  selectedVesselPos
}: {
  center: [number, number];
  bounds?: L.LatLngBoundsExpression;
  selectedVesselPos?: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedVesselPos) {
      try {
        const fitB = L.latLngBounds([center, selectedVesselPos]);
        map.fitBounds(fitB, { padding: [80, 80], maxZoom: 13, animate: true });
      } catch {
        map.flyTo(selectedVesselPos, 11, { animate: true });
      }
    } else if (bounds) {
      try {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12, animate: true });
      } catch {
        map.flyTo(center, 10, { animate: true });
      }
    } else {
      map.flyTo(center, 10, { animate: true });
    }
  }, [center, bounds, selectedVesselPos, map]);
  return null;
}

export default function MapWidget({ activeAlert, showVesselTracks = true }: MapWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const {
    data,
    selectedVessel,
    setSelectedVessel,
    mapLayers,
    setMapLayers
  } = useInvestigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute Spill Centroid & Geometry
  const { slickCenter, slickPolygons, slickAreaKm2, slickConfidence } = useMemo(() => {
    let center: [number, number] = [19.05, 72.85]; // Mumbai offshore default
    const det = data?.detection;
    const obs = data?.observation;
    let polygons: [number, number][][] = [];

    if (det?.geometry) {
      polygons = extractLeafletPolygons(det.geometry);
      const allPts = extractCoordinates(det.geometry.coordinates);
      if (allPts.length > 0) {
        const sumLon = allPts.reduce((acc, p) => acc + p[0], 0);
        const sumLat = allPts.reduce((acc, p) => acc + p[1], 0);
        center = [sumLat / allPts.length, sumLon / allPts.length];
      }
    } else if (obs?.geospatial_bounds) {
      const allPts = extractCoordinates(obs.geospatial_bounds.coordinates);
      if (allPts.length > 0) {
        const sumLon = allPts.reduce((acc, p) => acc + p[0], 0);
        const sumLat = allPts.reduce((acc, p) => acc + p[1], 0);
        center = [sumLat / allPts.length, sumLon / allPts.length];
      }
    }

    const area = det?.area_km2 || (det?.area_pct ? det.area_pct * 0.25 : 12.4);
    const conf = det?.confidence ? Math.round(det.confidence * 100) : 92;

    return {
      slickCenter: center,
      slickPolygons: polygons,
      slickAreaKm2: area,
      slickConfidence: conf
    };
  }, [data]);

  // Compute Source Region Geometry & Centroid
  const { sourcePolygons, sourceCenter } = useMemo(() => {
    const rec = data?.reconstruction;
    let polygons: [number, number][][] = [];
    let center: [number, number] | null = null;

    if (rec?.source_region) {
      polygons = extractLeafletPolygons(rec.source_region);
      const allPts = extractCoordinates(rec.source_region.coordinates);
      if (allPts.length > 0) {
        const sumLon = allPts.reduce((acc, p) => acc + p[0], 0);
        const sumLat = allPts.reduce((acc, p) => acc + p[1], 0);
        center = [sumLat / allPts.length, sumLon / allPts.length];
      }
    }
    return { sourcePolygons: polygons, sourceCenter: center };
  }, [data]);

  // Compute Hindcast (Backtracking) Drift Track
  const hindcastTrack = useMemo(() => {
    const rec = data?.reconstruction;
    const rawTrack = rec?.hindcast_track || [];
    if (rawTrack.length > 0) {
      return rawTrack.map((pt: any) => [pt.lat, pt.lon] as [number, number]);
    }
    if (sourceCenter && slickCenter) {
      const steps = 6;
      const track: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        track.push([
          slickCenter[0] + t * (sourceCenter[0] - slickCenter[0]),
          slickCenter[1] + t * (sourceCenter[1] - slickCenter[1])
        ]);
      }
      return track;
    }
    return [];
  }, [data, slickCenter, sourceCenter]);

  // Candidate Vessels from /full
  const candidates: any[] = useMemo(() => {
    if (data?.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      return data.candidates;
    }
    const attr = (data as any)?.attribution?.ranked_candidates;
    if (Array.isArray(attr) && attr.length > 0) return attr;
    const ranked = (data as any)?.ranked_candidates;
    if (Array.isArray(ranked) && ranked.length > 0) return ranked;
    return data?.candidates || [];
  }, [data]);

  const topCandidate = candidates.length > 0 ? candidates[0] : null;
  const activeCandidate = candidates.find(c => {
    const v = c?.vessel || c;
    return (v?.vessel_id || c?.vessel_id) === selectedVessel;
  }) || topCandidate;

  console.log("[MAP] candidates for vessel tracks:", candidates);
  console.log("[MAP] active vessel:", activeCandidate);

  // Selected vessel latest position for camera focus
  const selectedVesselPos = useMemo(() => {
    if (!showVesselTracks || !activeCandidate) return null;
    const v = activeCandidate.vessel || activeCandidate;
    const positions = v?.positions || [];
    if (positions.length === 0) return null;
    const latest = positions[positions.length - 1];
    if (!latest?.location?.coordinates || latest.location.coordinates.length < 2) return null;
    return [latest.location.coordinates[1], latest.location.coordinates[0]] as [number, number];
  }, [showVesselTracks, activeCandidate]);

  // Concentric Tactical Radar Ring Radii (Meters)
  const radarRadiiMeters = [2000, 5000, 10000];

  // Tactical SVG Custom Marker Icons
  const createShipIcon = (heading: number = 0, isSelected: boolean = false, isTop: boolean = false, rank?: number) => {
    const stroke = isSelected ? '#f97316' : (isTop ? '#eab308' : '#38bdf8');
    const fill = isSelected ? '#ea580c' : (isTop ? '#ca8a04' : '#0284c7');
    const size = isSelected ? 36 : 28;
    const rankBadge = rank ? `
      <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: ${isSelected ? '#f97316' : 'rgba(15, 23, 42, 0.95)'}; border: 1px solid ${stroke}; color: ${isSelected ? '#000' : '#f8fafc'}; font-family: monospace; font-size: 9px; font-weight: 800; padding: 0px 4px; border-radius: 3px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
        #${rank}
      </div>
    ` : '';

    const svg = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        ${rankBadge}
        <svg width="${size}" height="${size}" viewBox="0 0 32 32" style="transform: rotate(${heading}deg); filter: drop-shadow(0 0 ${isSelected ? '6px' : '3px'} ${stroke});">
          <path d="M16 2 L26 28 L16 22 L6 28 Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="16" cy="14" r="2.5" fill="#ffffff" />
        </svg>
      </div>
    `;
    return new L.DivIcon({
      className: 'tactical-ship-icon',
      html: svg,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  const createOilSpillBadge = () => {
    return new L.DivIcon({
      className: 'oil-spill-centroid-badge',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(234, 179, 8, 0.8); animation: pulse-fast 1.8s infinite;"></div>
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #000; border: 2px solid #eab308; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(234, 179, 8, 0.8);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  const createAttributionCalloutIcon = (name: string, score: number, rank?: number) => {
    const pct = Math.round(score * 100);
    const rankPrefix = rank ? `#${rank} ` : '';
    return new L.DivIcon({
      className: 'attribution-callout',
      html: `
        <div style="transform: translate(-50%, -100%); margin-top: -18px; background: rgba(15, 23, 42, 0.95); border: 1.5px solid #f97316; border-radius: 4px; padding: 4px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; white-space: nowrap; pointer-events: none;">
          <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #f8fafc; letter-spacing: 0.5px;">
            ${rankPrefix}${name.toUpperCase()}
          </div>
          <div style="font-size: 9px; font-weight: 700; color: #f97316; display: flex; align-items: center; gap: 3px;">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #f97316;"></span>
            ${pct}% ATTRIBUTION MATCH
          </div>
          <div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #f97316;"></div>
        </div>
      `,
      iconSize: [0, 0]
    });
  };

  // Compute Initial Bounding Box (Spill + Reconstructed Source + Vessel Tracks)
  const incidentBounds = useMemo(() => {
    const points: [number, number][] = [slickCenter];
    if (sourceCenter) points.push(sourceCenter);
    hindcastTrack.forEach(p => points.push(p));
    if (showVesselTracks) {
      candidates.forEach(cand => {
        const v = cand?.vessel || cand;
        const positions = v?.positions || [];
        positions.forEach((pos: any) => {
          if (pos?.location?.coordinates && pos.location.coordinates.length >= 2) {
            points.push([pos.location.coordinates[1], pos.location.coordinates[0]]);
          }
        });
      });
    }

    if (points.length > 1) {
      try {
        return L.latLngBounds(points);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [slickCenter, sourceCenter, hindcastTrack, candidates, showVesselTracks]);

  if (!mounted) {
    return (
      <div style={{ height: '100%', width: '100%', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', letterSpacing: '1px' }}>INITIALIZING GIS MAP ENGINE...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', background: '#020617' }}>
      <MapContainer
        center={slickCenter}
        zoom={10}
        style={{ height: '100%', width: '100%', background: '#020617' }}
        zoomControl={false}
      >
        <MapViewController center={slickCenter} bounds={incidentBounds} selectedVesselPos={selectedVesselPos} />

        {/* Tactical Satellite Basemap */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          opacity={0.65}
        />

        {/* 1. Tactical Concentric Distance Radar Rings around Spill Centroid */}
        {mapLayers.showRadarRings &&
          radarRadiiMeters.map((radius) => (
            <React.Fragment key={`radar-${radius}`}>
              <Circle
                center={slickCenter}
                radius={radius}
                pathOptions={{
                  color: 'rgba(56, 189, 248, 0.35)',
                  fillColor: 'transparent',
                  weight: 1,
                  dashArray: '4, 6'
                }}
              />
              <Marker
                position={[slickCenter[0] + radius / 111320, slickCenter[1]]}
                icon={
                  new L.DivIcon({
                    className: 'radar-dist-tag',
                    html: `<div style="font-family: monospace; font-size: 9px; color: rgba(56, 189, 248, 0.7); background: rgba(2, 6, 23, 0.8); padding: 1px 4px; border-radius: 2px; white-space: nowrap; transform: translate(-50%, -50%); border: 0.5px solid rgba(56, 189, 248, 0.3);">${(radius / 1000).toFixed(0)} KM / ${(radius / 1852).toFixed(1)} NM</div>`,
                    iconSize: [0, 0]
                  })
                }
              />
            </React.Fragment>
          ))}

        {/* 2. LAYER 1: Oil Spill Detected Geometry / Polygon */}
        {mapLayers.showSlick && (
          <React.Fragment>
            {slickPolygons.length > 0 ? (
              slickPolygons.map((ring, i) => (
                <Polygon
                  key={`slick-ring-${i}`}
                  positions={ring}
                  pathOptions={{
                    color: '#eab308',
                    fillColor: '#ca8a04',
                    fillOpacity: 0.45,
                    weight: 2
                  }}
                />
              ))
            ) : (
              <Circle
                center={slickCenter}
                radius={Math.sqrt((slickAreaKm2 * 1000000) / Math.PI)}
                pathOptions={{
                  color: '#eab308',
                  fillColor: '#ca8a04',
                  fillOpacity: 0.45,
                  weight: 2,
                  dashArray: '4, 4'
                }}
              />
            )}

            {/* Slick Centroid Badge with Oil Droplet */}
            <Marker position={slickCenter} icon={createOilSpillBadge()}>
              <Popup>
                <div style={{ color: '#0f172a', fontSize: '12px', minWidth: '180px' }}>
                  <strong style={{ color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Detected Oil Slick
                  </strong>
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div>Area: <strong>{slickAreaKm2.toFixed(1)} km²</strong></div>
                    <div>Confidence: <strong>{slickConfidence}%</strong></div>
                    <div>Coords: {slickCenter[0].toFixed(4)}°N, {slickCenter[1].toFixed(4)}°E</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        )}

        {/* 3. LAYER 1: Reconstructed Source Region (Estimated Release Origin) */}
        {mapLayers.showSourceRegion && sourcePolygons.length > 0 && (
          <React.Fragment>
            {sourcePolygons.map((ring, idx) => (
              <Polygon
                key={`source-ring-${idx}`}
                positions={ring}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.2,
                  weight: 1.5,
                  dashArray: '3, 6'
                }}
              />
            ))}
            {sourceCenter && (
              <Marker
                position={sourceCenter}
                icon={
                  new L.DivIcon({
                    className: 'source-origin-tag',
                    html: `
                      <div style="background: rgba(239, 68, 68, 0.2); border: 1px dashed #ef4444; color: #f87171; font-family: monospace; font-size: 10px; padding: 2px 6px; border-radius: 3px; white-space: nowrap; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 4px;">
                        <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #ef4444;"></span>
                        ESTIMATED RELEASE ORIGIN
                      </div>
                    `,
                    iconSize: [0, 0]
                  })
                }
              />
            )}
          </React.Fragment>
        )}

        {/* 4. LAYER 1: Hindcast Drift Path (Oil Backtracking) */}
        {mapLayers.showHindcast && hindcastTrack.length > 1 && (
          <React.Fragment>
            <Polyline
              positions={hindcastTrack}
              pathOptions={{
                color: '#38bdf8',
                weight: 2.5,
                opacity: 0.9,
                dashArray: '6, 6'
              }}
            />
            {/* Draw drift flow direction nodes */}
            {hindcastTrack.map((pt, i) => {
              if (i % 2 !== 0 && i !== hindcastTrack.length - 1) return null;
              return (
                <Circle
                  key={`drift-node-${i}`}
                  center={pt}
                  radius={120}
                  pathOptions={{
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.85,
                    weight: 1
                  }}
                />
              );
            })}
          </React.Fragment>
        )}

        {/* 5. LAYER 2: Vessel Backtracking on Map (Requirement 10 & 11) */}
        {mapLayers.showTracks && showVesselTracks &&
          candidates.map((cand, candIdx) => {
            const vessel = cand?.vessel || cand;
            const vesselId = vessel?.vessel_id || cand?.vessel_id || `vessel-${candIdx}`;
            const isSelected = vesselId === selectedVessel;
            const isTopRank = cand.rank === 1 || candIdx === 0;
            const positions = vessel?.positions || cand?.positions || [];
            if (positions.length === 0) return null;

            // Sort positions chronologically
            const sorted = [...positions].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            const latLngs = sorted
              .filter(p => p?.location?.coordinates && p.location.coordinates.length >= 2)
              .map(p => [p.location.coordinates[1], p.location.coordinates[0]] as [number, number]);

            if (latLngs.length === 0) return null;

            const latestPos = sorted[sorted.length - 1];
            const latestLatLng: [number, number] = [
              latestPos.location.coordinates[1],
              latestPos.location.coordinates[0]
            ];
            const heading = latestPos.heading || latestPos.course || 0;
            const distToSpillKm = haversineDistKm(
              latestLatLng[0],
              latestLatLng[1],
              slickCenter[0],
              slickCenter[1]
            );
            const vesselName = vessel?.name || cand.name || 'Unknown Vessel';
            const vesselScore = cand.attribution_score ?? cand.score ?? 0;

            return (
              <React.Fragment key={`vessel-${vesselId}`}>
                {/* Connected dotted/dashed backtracking trajectory line */}
                <Polyline
                  positions={latLngs}
                  pathOptions={{
                    color: isSelected ? '#f97316' : (isTopRank ? '#eab308' : '#38bdf8'),
                    weight: isSelected ? 3.5 : 2,
                    dashArray: isSelected ? '6, 6' : '4, 6',
                    opacity: isSelected ? 1.0 : 0.75
                  }}
                />

                {/* Trajectory waypoint breadcrumb dots */}
                {sorted.map((pos, pIdx) => {
                  if (pIdx % 6 !== 0 && pIdx !== sorted.length - 1) return null;
                  return (
                    <Circle
                      key={`waypoint-${vesselId}-${pIdx}`}
                      center={[pos.location.coordinates[1], pos.location.coordinates[0]]}
                      radius={isSelected ? 60 : 35}
                      pathOptions={{
                        color: isSelected ? '#ea580c' : '#0284c7',
                        fillColor: isSelected ? '#f97316' : '#38bdf8',
                        fillOpacity: 0.9,
                        weight: 1
                      }}
                    />
                  );
                })}

                {/* Vessel Marker at latest/relevant position */}
                <Marker
                  position={latestLatLng}
                  icon={createShipIcon(heading, isSelected, isTopRank, cand.rank || (candIdx + 1))}
                  zIndexOffset={isSelected ? 1000 : (isTopRank ? 500 : 100)}
                  eventHandlers={{
                    click: () => setSelectedVessel(vesselId)
                  }}
                >
                  <Popup>
                    <div style={{ color: '#0f172a', fontSize: '12px', minWidth: '190px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: isSelected ? '#c2410c' : '#0284c7', textTransform: 'uppercase' }}>
                          Rank #{cand.rank || (candIdx + 1)}
                        </span>
                        <span style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#c2410c', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                          {(vesselScore * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {vesselName}
                      </div>
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                        <div>MMSI: <strong>{vessel?.mmsi || cand.mmsi || 'N/A'}</strong></div>
                        <div>Type: <strong>{vessel?.vessel_type || cand.vessel_type || 'N/A'}</strong></div>
                        <div>Speed: <strong>{latestPos.speed !== undefined ? `${latestPos.speed.toFixed(1)} kn` : 'N/A'}</strong></div>
                        <div>Heading: <strong>{heading ? `${heading.toFixed(0)}°` : 'N/A'}</strong></div>
                        <div>Coords: <strong>{latestLatLng[0].toFixed(4)}°N, {latestLatLng[1].toFixed(4)}°E</strong></div>
                        <div>Dist to Spill: <strong>{distToSpillKm.toFixed(2)} km</strong></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Callout Tooltip pinned over Selected or Top Suspect Vessel */}
                {(isSelected || (isTopRank && !selectedVessel)) && (
                  <Marker
                    position={latestLatLng}
                    icon={createAttributionCalloutIcon(vesselName, vesselScore, cand.rank || (candIdx + 1))}
                    zIndexOffset={1100}
                  />
                )}
              </React.Fragment>
            );
          })}
      </MapContainer>

      {/* Crosshair Tactical Grid Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(14, 165, 233, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          zIndex: 400
        }}
      />

      {/* MAP LEGEND (Requirement 12) */}
      {mapLayers.showLegend && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            fontSize: '11px',
            minWidth: '210px'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: '#f8fafc',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '4px'
            }}
          >
            GIS Map Legend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Oil Spill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  background: 'rgba(234, 179, 8, 0.45)',
                  border: '2px solid #eab308',
                  borderRadius: '3px'
                }}
              />
              <span style={{ color: '#f1f5f9' }}>Oil Spill</span>
            </div>
            {/* Estimated Release Origin */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1.5px dashed #ef4444',
                  borderRadius: '3px'
                }}
              />
              <span style={{ color: '#f1f5f9' }}>Estimated Release Origin</span>
            </div>
            {/* Oil Backtracking */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '18px', height: '0px', borderTop: '2.5px dashed #38bdf8' }} />
              <span style={{ color: '#f1f5f9' }}>Oil Backtracking</span>
            </div>
            {/* Vessel Layers (only when vessel tracks are enabled) */}
            {showVesselTracks && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: '0',
                        height: '0',
                        borderLeft: '3px solid transparent',
                        borderRight: '3px solid transparent',
                        borderBottom: '6px solid #000'
                      }}
                    />
                  </div>
                  <span style={{ color: '#f1f5f9' }}>Vessel</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '18px', height: '0px', borderTop: '2px dashed #60a5fa' }} />
                  <span style={{ color: '#f1f5f9' }}>Vessel Track / Backtracking</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '18px', height: '0px', borderTop: '3.5px dashed #f97316' }} />
                  <span style={{ color: '#f97316', fontWeight: 600 }}>Selected Vessel</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOP LEFT HUD: Live Tactical Telemetry */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          fontSize: '11px',
          minWidth: '220px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
          <Radio size={14} color="#38bdf8" />
          <span style={{ fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            TACTICAL TELEMETRY
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>SPILL LOCATION</div>
            <div style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>
              {slickCenter[0].toFixed(2)}°N, {slickCenter[1].toFixed(2)}°E
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#94a3b8' }}>SLICK EXTENT</div>
            <div style={{ color: '#eab308', fontFamily: 'monospace' }}>
              {slickAreaKm2.toFixed(1)} km² ({slickConfidence}%)
            </div>
          </div>
        </div>

        {showVesselTracks && activeCandidate && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>TARGET VESSEL:</span>
              <span style={{ color: '#f97316', fontWeight: 600 }}>{activeCandidate.vessel.name || 'UNKNOWN'}</span>
            </div>
            {activeCandidate.vessel.positions && activeCandidate.vessel.positions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>DIST TO SPILL:</span>
                <span style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                  {haversineDistKm(
                    activeCandidate.vessel.positions[activeCandidate.vessel.positions.length - 1].location.coordinates[1],
                    activeCandidate.vessel.positions[activeCandidate.vessel.positions.length - 1].location.coordinates[0],
                    slickCenter[0],
                    slickCenter[1]
                  ).toFixed(2)} km
                </span>
              </div>
            )}
          </div>
        )}

        {data?.environment && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wind size={12} color="#38bdf8" /> Wind: {data.environment.wind_speed_kn}kn
            </span>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} color="#38bdf8" /> Current: {data.environment.current_speed_kn}kn
            </span>
          </div>
        )}
      </div>

      {/* BOTTOM RIGHT: Radar Scanner Sweep HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          pointerEvents: 'none',
          width: '84px',
          height: '84px',
          borderRadius: '50%',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          background: 'rgba(2, 6, 23, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(14, 165, 233, 0.2)'
        }}
      >
        <div style={{ position: 'absolute', inset: '10px', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: '24px', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(56, 189, 248, 0.25)' }} />
        <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(56, 189, 248, 0.25)' }} />
        <div
          style={{
            position: 'absolute',
            width: '50%',
            height: '50%',
            top: 0,
            right: 0,
            transformOrigin: 'bottom left',
            background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.6) 0deg, transparent 60deg)',
            animation: 'radar-sweep 4s linear infinite'
          }}
        />
        <span style={{ fontSize: '8px', color: '#38bdf8', fontFamily: 'monospace', zIndex: 2 }}>AIS SCAN</span>
      </div>

      {/* FLOATING GIS LAYERS TOGGLE */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000 }}>
        {showLayerMenu && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '0',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '180px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              fontSize: '11px'
            }}
          >
            <div style={{ fontWeight: 700, color: '#f8fafc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              Map Layers
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mapLayers.showSlick}
                onChange={e => setMapLayers(prev => ({ ...prev, showSlick: e.target.checked }))}
              />
              Oil Spill Slick
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mapLayers.showSourceRegion}
                onChange={e => setMapLayers(prev => ({ ...prev, showSourceRegion: e.target.checked }))}
              />
              Estimated Origin
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mapLayers.showHindcast}
                onChange={e => setMapLayers(prev => ({ ...prev, showHindcast: e.target.checked }))}
              />
              Oil Backtracking
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mapLayers.showTracks}
                onChange={e => setMapLayers(prev => ({ ...prev, showTracks: e.target.checked }))}
              />
              Vessel Backtracking
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mapLayers.showRadarRings}
                onChange={e => setMapLayers(prev => ({ ...prev, showRadarRings: e.target.checked }))}
              />
              Range Rings
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mapLayers.showLegend}
                onChange={e => setMapLayers(prev => ({ ...prev, showLegend: e.target.checked }))}
              />
              Map Legend
            </label>
          </div>
        )}

        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            borderRadius: '6px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          <Layers size={14} color="#38bdf8" />
          {showLayerMenu ? 'Close Layers' : 'GIS Layers'}
        </button>
      </div>

      <style jsx global>{`
        @keyframes radar-sweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
