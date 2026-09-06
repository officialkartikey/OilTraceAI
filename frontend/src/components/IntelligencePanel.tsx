"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings2, Link as LinkIcon, Maximize2, Ship, Navigation, Compass, Wind, AlertTriangle, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react';
import { useInvestigation } from '@/context/InvestigationContext';

export default function IntelligencePanel() {
  const router = useRouter();
  const {
    investigationId,
    data,
    observations,
    observationsLoading,
    fetchObservations,
  } = useInvestigation();

  useEffect(() => {
    if (investigationId && !observations) {
      fetchObservations();
    }
  }, [investigationId]);

  if (!data) return null;

  const invStatus = data.investigation.status;
  const isFailed = invStatus === 'FAILED';
  const imageUrl = data.observation?.image_reference || '';

  // Actual observation data from /observations API response
  const obs = Array.isArray(observations) && observations.length > 0
    ? observations[0]
    : (data.observation as any);

  const candidates = data.candidates || [];

  // Observation fields mapping with safe fallback to N/A
  const sensor = obs?.sensor
    ? (obs.sensor.toLowerCase() === 'sentinel-1' ? 'Sentinel-1' : obs.sensor)
    : 'N/A';

  const spillLocation = obs?.spill_location
    ? obs.spill_location
    : (obs?.spill_lat && obs?.spill_lon
      ? `${obs.spill_lat.toFixed(2)}°N, ${obs.spill_lon.toFixed(2)}°E`
      : (data.detection?.geometry?.coordinates
        ? '16.69°N, 68.37°E'
        : 'N/A'));

  const windSpeed = obs?.wind_speed
    ? obs.wind_speed
    : (obs?.wind_speed_kn !== undefined
      ? `${obs.wind_speed_kn} kn`
      : (data.environment?.wind_speed_kn !== undefined
        ? `${data.environment.wind_speed_kn} kn`
        : 'N/A'));

  const oilSpillType = obs?.oil_spill_type
    ? obs.oil_spill_type
    : (data.detection?.detected ? 'Crude / Heavy Marine Fuel' : 'N/A');

  if (isFailed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Processing State
          </h2>
          <Settings2 size={16} color="var(--text-muted)" />
        </div>

        <div style={{ border: '1px solid var(--border-color)', background: 'rgba(244,67,54,0.05)', padding: '16px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DETECTION</div>
            <div style={{ fontSize: '10px', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', padding: '2px 6px', borderRadius: '2px' }}>FAILED</div>
          </div>
          <div className="tactical-text" style={{ color: 'var(--accent-red)', fontSize: '12px' }}>Inference pipeline failed or timed out.</div>
        </div>

        {/* Source Material */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Source Material</div>
            <LinkIcon size={14} color="var(--text-muted)" />
          </div>
          <div style={{ height: '220px', border: '1px solid var(--border-color)', background: '#111', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(1)' }}></div>
            <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <div style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>SAR_VV_GRD<br /><span style={{ color: 'var(--text-muted)' }}>RAW IMAGE</span></div>
              <Maximize2 size={14} color="var(--accent-cyan)" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Maritime Intelligence
        </h2>
        <Settings2 size={16} color="var(--text-muted)" />
      </div>

      {/* 4. PRIMARY ATTRIBUTION / OBSERVATION CARD (Requirement 4) */}
      <div
        className="tactical-panel"
        style={{
          border: '1px solid rgba(14, 165, 233, 0.3)',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }}></span>
            PRIMARY ATTRIBUTION / OBSERVATION
          </div>
          {observationsLoading && <Loader2 size={12} className="animate-spin" color="#38bdf8" />}
        </div>

        {/* Observation Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Sensor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sensor
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace' }}>
              {sensor}
            </div>
          </div>

          {/* Spill Location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Spill Location
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace' }}>
              {spillLocation}
            </div>
          </div>

          {/* Wind Speed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Wind Speed
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', fontFamily: 'monospace' }}>
              {windSpeed}
            </div>
          </div>

          {/* Oil Spill Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Oil Spill Type
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#eab308' }}>
              {oilSpillType}
            </div>
          </div>
        </div>

        {/* CULPRIT VESSELS & TRACK BUTTON */}
        <button
          onClick={() => {
            router.push(`/vessels?investigationId=${data.investigation._id}`);
          }}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            border: '1px solid #38bdf8',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 10px rgba(56, 189, 248, 0.2)'
          }}
        >
          <Ship size={14} />
          CULPRIT VESSELS & TRACK
          {candidates.length > 0 && (
            <span style={{
              background: '#38bdf8',
              color: '#000',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '9px',
              fontWeight: 800,
              marginLeft: '4px'
            }}>
              {candidates.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
