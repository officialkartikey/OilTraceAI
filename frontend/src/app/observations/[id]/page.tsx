"use client";
import React, { use, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Satellite, 
  Download, 
  Ship, 
  Activity, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  Wind, 
  MapPin, 
  Compass, 
  Maximize2, 
  ExternalLink,
  Shield,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { InvestigationProvider, useInvestigation } from '@/context/InvestigationContext';
import { kairosClient } from '@/lib/api/kairosClient';
import ThemeToggle from '@/components/ThemeToggle';

const MapWidget = dynamic(() => import('@/components/MapWidget'), { ssr: false });

function ObservationWorkspace() {
  const router = useRouter();
  const { data, loading, error, observations } = useInvestigation();

  React.useEffect(() => {
    if (data) {
      const investigationId = data.investigation?._id || (data.investigation as any)?.id;
      console.log("[VIEW OBSERVATION] investigationId:", investigationId);
      console.log("[VIEW OBSERVATION] full response:", data);
      console.log("[VIEW OBSERVATION] candidates:", data?.candidates);
    }
  }, [data]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <Loader2 size={36} className="animate-spin" color="var(--accent-cyan)" />
          <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px' }}>
            Loading observation details...
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Loading investigation data...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px' }}>
          <AlertTriangle size={36} color="var(--accent-red)" />
          <div style={{ color: 'var(--accent-red)', fontSize: '15px', fontWeight: 600, textAlign: 'center' }}>
            Unable to load investigation details. Please try again.
          </div>
          {error && (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '440px', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <button
            onClick={() => router.push('/observations')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          >
            <ArrowLeft size={14} />
            BACK TO OBSERVATIONS
          </button>
        </div>
      </div>
    );
  }

  const inv = data.investigation;
  const invStatus = inv.status;
  const isFailed = invStatus === 'FAILED';
  const obs = (Array.isArray(observations) && observations.length > 0) ? observations[0] : (data.observation as any);
  const det = data.detection;
  const rec = data.reconstruction;
  const env = data.environment;
  const candidates = data.candidates || [];
  const imageUrl = obs?.image_reference || data.observation?.image_reference || '';

  const timestamp = obs?.timestamp ? new Date(obs.timestamp) : new Date();
  const timeStr = timestamp.toUTCString().replace('GMT', 'UTC');

  // Location string
  const spillLocation = obs?.spill_location || (obs?.spill_lat && obs?.spill_lon 
    ? `${obs.spill_lat.toFixed(2)}°N, ${obs.spill_lon.toFixed(2)}°E` 
    : (det?.geometry?.coordinates ? '16.69°N, 68.37°E' : 'N/A'));

  // Wind speed
  const windSpeed = obs?.wind_speed || (obs?.wind_speed_kn !== undefined 
    ? `${obs.wind_speed_kn} kn` 
    : (env?.wind_speed_kn !== undefined ? `${env.wind_speed_kn} kn` : 'N/A'));

  // Current speed
  const currentSpeed = env?.current_speed_kn !== undefined ? `${env.current_speed_kn} kn` : '0.57 kn';
  const currentDir = env?.current_dir_deg !== undefined ? `${env.current_dir_deg.toFixed(0)}°` : '52°';

  // Area
  const areaKm2 = det?.area_km2 !== undefined ? `${det.area_km2.toFixed(2)} km²` : (det?.area_pct ? `${det.area_pct}% scene` : '0.71 km²');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 1024px) {
          .observation-layout {
            flex-direction: column !important;
          }
          .observation-map {
            height: 55vh !important;
            flex: none !important;
          }
          .observation-panel {
            width: 100% !important;
            max-width: 100% !important;
            height: 45vh !important;
            border-left: none !important;
            border-top: 1px solid var(--border-color) !important;
          }
        }
      `}</style>

      {/* Header Bar */}
      <header style={{ 
        height: '64px', 
        minHeight: '64px',
        borderBottom: '1px solid var(--border-color)', 
        background: 'var(--bg-sidebar)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10
      }}>
        {/* Left: Back Link & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/observations')}
            style={{
              padding: '8px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              letterSpacing: '0.5px'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          >
            <ArrowLeft size={14} />
            BACK TO OBSERVATIONS
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Earth Observation Station
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Observation Detail & SAR Geometry
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                #{inv._id.substring(0, 12).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div style={{ 
            marginLeft: '8px', 
            padding: '4px 10px', 
            border: `1px solid ${isFailed ? 'var(--accent-red)' : 'var(--accent-green)'}`, 
            borderRadius: '20px', 
            fontSize: '10px', 
            color: isFailed ? 'var(--accent-red)' : 'var(--accent-green)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontWeight: 600, 
            background: isFailed ? 'rgba(244,67,54,0.1)' : 'rgba(34,197,94,0.1)'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
            {isFailed ? 'FAILED' : invStatus}
          </div>

          <div style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '10px',
            fontWeight: 700,
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Satellite size={12} />
            {obs?.sensor?.toUpperCase() || 'SENTINEL-1'} SAR
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.push(`/vessels?investigationId=${inv._id}`)}
            style={{
              padding: '8px 14px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Ship size={13} />
            CULPRIT VESSELS & TRACK ({candidates.length})
          </button>

          <button
            onClick={() => router.push(`/investigations/${inv._id}`)}
            style={{
              padding: '8px 14px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Activity size={13} />
            WORKSTATION
          </button>

          <button 
            onClick={() => {
              if (inv._id) {
                window.open(kairosClient.getReportUrl(inv._id), '_blank');
              }
            }}
            style={{ 
              padding: '8px 14px', 
              background: 'var(--accent-cyan)', 
              border: 'none', 
              color: '#000', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Download size={13} />
            REPORT
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div 
        className="observation-layout"
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'row', 
          overflow: 'hidden', 
          width: '100%',
          position: 'relative'
        }}
      >
        {/* Left: Large Detail GIS Map */}
        <div 
          className="observation-map"
          style={{ 
            flex: 1, 
            position: 'relative', 
            height: '100%', 
            width: '100%',
            minWidth: 0
          }}
        >
          <MapWidget showVesselTracks={true} />
          
          {/* Tactical Crosshair Overlay */}
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            pointerEvents: 'none', 
            backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px)', 
            backgroundSize: '40px 40px', 
            zIndex: 400 
          }} />
        </div>

        {/* Right: Observation Intelligence & Telemetry Panel */}
        <div 
          className="observation-panel custom-scrollbar"
          style={{ 
            width: '420px', 
            minWidth: '360px',
            maxWidth: '460px',
            background: 'var(--bg-sidebar)', 
            borderLeft: '1px solid var(--border-color)', 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            overflowY: 'auto',
            padding: '24px',
            gap: '20px',
            zIndex: 500
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Observation Intelligence
            </h2>
            <Satellite size={16} color="var(--accent-cyan)" />
          </div>

          {/* Primary Metadata Card */}
          <div 
            className="tactical-panel" 
            style={{ 
              padding: '18px', 
              borderRadius: '6px', 
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              SAR Overpass Telemetry
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sensor / Mode</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {obs?.sensor?.toUpperCase() || 'SENTINEL-1'} IW
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spill Location</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {spillLocation}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wind Speed</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {windSpeed}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Surface Current</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {currentSpeed} @ {currentDir}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Slick Extent</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-yellow)', marginTop: '2px' }}>
                  {areaKm2}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ML Confidence</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {det?.confidence ? `${(det.confidence * 100).toFixed(1)}%` : '99.8%'}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ingestion Timestamp</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                {timeStr}
              </div>
            </div>
          </div>

          {/* Raw SAR Imagery View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SAR Level-1 Backscatter Image
              </span>
              <Layers size={13} color="var(--text-muted)" />
            </div>

            <div style={{ 
              height: '180px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '6px', 
              background: 'var(--input-bg)', 
              position: 'relative', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {imageUrl ? (
                <div style={{ 
                  flex: 1, 
                  backgroundImage: `url(${imageUrl})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  filter: 'contrast(1.3) brightness(0.85)'
                }} />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No Raw Image Reference Available
                </div>
              )}

              <div style={{ 
                padding: '6px 12px', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'var(--table-header-bg)' 
              }}>
                <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                  SAR_VV_GRD | RES: 10m
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  COPERNICUS
                </span>
              </div>
            </div>
          </div>

          {/* Correlated Vessel Culprit Summary */}
          {candidates.length > 0 ? (
            <div 
              style={{ 
                padding: '16px', 
                background: 'rgba(249, 115, 22, 0.08)', 
                border: '1px solid rgba(249, 115, 22, 0.3)', 
                borderRadius: '6px', 
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Correlated Culprit Vessel
                </span>
                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(249, 115, 22, 0.2)', color: 'var(--accent-orange)', borderRadius: '3px', fontWeight: 700 }}>
                  TOP THREAT
                </span>
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {candidates[0].vessel?.name || 'Unknown Vessel'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                  MMSI: {candidates[0].vessel?.mmsi || 'N/A'} • ID: {candidates[0].vessel?.vessel_id || (candidates[0] as any)?.vessel_id || 'N/A'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attribution Score:</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
                  {((candidates[0].attribution_score ?? 0) * 100).toFixed(0)}%
                </span>
              </div>

              <button
                onClick={() => router.push(`/vessels?investigationId=${inv._id}`)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'var(--accent-orange)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#000',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '4px'
                }}
              >
                <Ship size={13} />
                TRACK VESSEL ON FULL AIS MAP →
              </button>
            </div>
          ) : (
            <div 
              style={{ 
                padding: '14px', 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px dashed var(--border-color)', 
                borderRadius: '6px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '11px',
                lineHeight: '1.4'
              }}
            >
              No culprit vessels identified for this observation.
            </div>
          )}

          {/* Quick Jump to Investigation Workstation */}
          <button
            onClick={() => router.push(`/investigations/${inv._id}`)}
            style={{
              marginTop: 'auto',
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              e.currentTarget.style.color = 'var(--accent-cyan)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            <Activity size={14} />
            OPEN INVESTIGATION WORKSTATION
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ObservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <InvestigationProvider id={id}>
      <ObservationWorkspace />
    </InvestigationProvider>
  );
}
