"use client";
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Ship, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Loader2, 
  Compass, 
  Layers, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { InvestigationProvider, useInvestigation } from '@/context/InvestigationContext';
import CandidateVesselsList from '@/components/CandidateVesselsList';
import { kairosClient } from '@/lib/api/kairosClient';

const MapWidget = dynamic(() => import('@/components/MapWidget'), { ssr: false });

function VesselsWorkstation({ investigationId }: { investigationId: string }) {
  const router = useRouter();
  const { data, loading, error, refresh } = useInvestigation();

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <Loader2 size={36} className="animate-spin" color="var(--accent-cyan)" />
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Retrieving Vessel Tracks & AIS Telemetry...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <AlertTriangle size={36} color="var(--accent-red)" />
          <div style={{ color: 'var(--accent-red)', fontSize: '15px', fontWeight: 600 }}>
            {error || 'Failed to load investigation data'}
          </div>
          <Link 
            href={`/investigations/${investigationId}`}
            style={{ 
              color: 'var(--accent-cyan)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '13px',
              textDecoration: 'underline' 
            }}
          >
            ← Return to Investigation
          </Link>
        </div>
      </div>
    );
  }

  const invStatus = data.investigation.status;
  const isFailed = invStatus === 'FAILED';
  const candidates: any[] = (
    data?.candidates && Array.isArray(data.candidates) && data.candidates.length > 0
      ? data.candidates
      : (data as any)?.attribution?.ranked_candidates && Array.isArray((data as any).attribution.ranked_candidates)
        ? (data as any).attribution.ranked_candidates
        : (data as any)?.ranked_candidates && Array.isArray((data as any).ranked_candidates)
          ? (data as any).ranked_candidates
          : data?.candidates || []
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 1024px) {
          .vessels-layout-container {
            flex-direction: column !important;
          }
          .vessels-map-container {
            height: 55vh !important;
            flex: none !important;
          }
          .vessels-panel-container {
            width: 100% !important;
            max-width: 100% !important;
            height: 45vh !important;
            border-left: none !important;
            border-top: 1px solid var(--border-color) !important;
          }
        }
      `}</style>

      {/* Top Header Bar */}
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
        {/* Left: Back Button & Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push(`/investigations/${investigationId}`)}
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
              letterSpacing: '0.5px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          >
            <ArrowLeft size={14} />
            BACK TO INVESTIGATION
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Maritime Tracking & Attribution Workstation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Culprit Vessels & AIS Tracks
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                #{data.investigation._id.substring(0, 12).toUpperCase()}
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

          {/* Candidates count badge */}
          <div style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '10px',
            fontWeight: 700,
            background: candidates.length > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${candidates.length > 0 ? '#38bdf8' : 'var(--border-color)'}`,
            color: candidates.length > 0 ? '#38bdf8' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Ship size={12} />
            {candidates.length} CULPRIT VESSEL{candidates.length !== 1 ? 'S' : ''}
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => refresh()}
            style={{ 
              padding: '8px 14px', 
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer' 
            }}
          >
            <RefreshCw size={13} /> Refresh Data
          </button>

          <button 
            onClick={() => {
              if (data.investigation._id) {
                window.open(kairosClient.getReportUrl(data.investigation._id), '_blank');
              }
            }}
            style={{ 
              padding: '8px 16px', 
              background: 'var(--accent-cyan)', 
              border: 'none', 
              color: '#000', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer' 
            }}
          >
            <Download size={14} /> EXPORT REPORT
          </button>
        </div>
      </header>

      {/* Main Workspace: 70/30 Split Layout */}
      <div 
        className="vessels-layout-container"
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'row', 
          overflow: 'hidden', 
          width: '100%',
          position: 'relative'
        }}
      >
        {/* Left Side: Large GIS Map (65% - 70%) */}
        <div 
          className="vessels-map-container"
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

        {/* Right Side: Candidate Vessels & Details Panel (30% - 35%) */}
        <div 
          className="vessels-panel-container"
          style={{ 
            width: '460px', 
            minWidth: '380px',
            maxWidth: '500px',
            background: 'var(--bg-sidebar)', 
            borderLeft: '1px solid var(--border-color)', 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            overflow: 'hidden',
            zIndex: 500
          }}
        >
          <CandidateVesselsList />
        </div>
      </div>
    </div>
  );
}

function VesselsPageContent() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get('investigationId') || searchParams.get('id');
  const investigationId = rawId ? rawId.trim() : null;

  if (!investigationId) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        width: '100%', 
        background: 'var(--bg-base)',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{ 
          maxWidth: '480px', 
          width: '100%', 
          background: 'var(--bg-sidebar)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px', 
          padding: '36px', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Ship size={28} color="var(--accent-cyan)" />
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
              No Investigation Selected
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Select an active maritime incident from the Investigations catalog to inspect correlated culprit vessels, kinematic hindcast trajectories, and AIS position telemetry.
            </p>
          </div>

          <Link
            href="/investigations"
            style={{
              marginTop: '8px',
              padding: '10px 20px',
              background: 'var(--accent-cyan)',
              color: '#000',
              fontWeight: 700,
              fontSize: '12px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none'
            }}
          >
            VIEW INVESTIGATIONS CATALOG
          </Link>
        </div>
      </div>
    );
  }

  return (
    <InvestigationProvider id={investigationId}>
      <VesselsWorkstation investigationId={investigationId} />
    </InvestigationProvider>
  );
}

export default function VesselsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <Loader2 size={36} className="animate-spin" color="var(--accent-cyan)" />
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '1px' }}>INITIALIZING WORKSPACE...</div>
        </div>
      </div>
    }>
      <VesselsPageContent />
    </Suspense>
  );
}
