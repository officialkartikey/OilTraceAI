"use client";
import React, { use, useState } from 'react';
import dynamic from 'next/dynamic';
import { InvestigationProvider, useInvestigation } from '@/context/InvestigationContext';

const MapWidget = dynamic(() => import('@/components/MapWidget'), { ssr: false });

import { Loader2, AlertTriangle, Play, Download, Clock, Bell, MoreVertical, RefreshCw, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import Link from 'next/link';
import InvestigationPipeline from '@/components/InvestigationPipeline';
import IntelligencePanel from '@/components/IntelligencePanel';
import { kairosClient } from '@/lib/api/kairosClient';

import ThemeToggle from '@/components/ThemeToggle';

function InvestigationWorkspace() {
  const { 
    data, loading, error, refresh
  } = useInvestigation();
  const [isPipelineOpen, setIsPipelineOpen] = useState(true);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(true);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <Loader2 size={32} className="animate-spin" color="var(--accent-cyan)" />
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>INITIALIZING WORKSTATION...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: 'var(--accent-red)', fontSize: '14px', fontWeight: 600 }}>{error || 'Investigation not found'}</div>
          <Link href="/investigations" style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
             ← Back to Investigations
          </Link>
        </div>
      </div>
    );
  }

  const isAnalyzing = data.investigation.status === 'ANALYZING';
  const invStatus = data.investigation.status;
  const isFailed = invStatus === 'FAILED';
  const imageUrl = data.observation?.image_reference || '';
  const timestamp = data.observation?.timestamp ? new Date(data.observation.timestamp) : new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
      
      {/* Header Bar */}
      <header style={{ 
        height: '64px', minHeight: '64px',
        borderBottom: '1px solid var(--header-border)', 
        background: 'var(--header-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: 'var(--shadow-tactical)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={() => setIsPipelineOpen(!isPipelineOpen)}
            style={{
              background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-highlight)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
            title={isPipelineOpen ? "Hide Pipeline" : "Show Pipeline"}
          >
            {isPipelineOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Maritime Station
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Investigation Workstation
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/</div>
          <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {data.investigation._id.substring(0,12).toUpperCase()}
          </div>
          <div style={{ 
            marginLeft: '8px', padding: '3px 10px', border: `1px solid ${isFailed ? 'var(--accent-red)' : 'var(--accent-green)'}`, 
            borderRadius: '20px', fontSize: '10px', color: isFailed ? 'var(--accent-red)' : 'var(--accent-green)', 
            display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: isFailed ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
            {isFailed ? 'FAILED' : invStatus}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isFailed && (
            <button 
              onClick={async () => {
                await kairosClient.triggerAnalysis(data.investigation._id);
                refresh();
              }}
              style={{ padding: '8px 14px', background: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <RefreshCw size={13} /> Retry Analysis
            </button>
          )}
          <button 
            onClick={() => {
              if (data.investigation._id) {
                window.open(kairosClient.getReportUrl(data.investigation._id), '_blank');
              }
            }}
            style={{ padding: '8px 14px', background: isFailed ? 'transparent' : 'var(--accent-cyan)', border: isFailed ? '1px solid var(--border-color)' : 'none', color: isFailed ? 'var(--text-secondary)' : '#000', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
          >
            {isFailed ? 'Export Log' : <><Download size={13} /> EXPORT REPORT</>}
          </button>
          
          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }}></div>
          
          <ThemeToggle size={16} />

          <button 
            onClick={() => setIsIntelligenceOpen(!isIntelligenceOpen)}
            style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', transition: 'all 0.2s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-highlight)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
            title={isIntelligenceOpen ? "Hide Intelligence" : "Show Intelligence"}
          >
            {isIntelligenceOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `${isPipelineOpen ? '320px' : '0px'} 1fr ${isIntelligenceOpen ? '380px' : '0px'}`, overflow: 'hidden', transition: 'grid-template-columns 0.3s ease' }}>
        
        {/* Left Column - Pipeline Only */}
        <div style={{ 
          background: 'var(--bg-sidebar)', 
          borderRight: isPipelineOpen ? '1px solid var(--border-color)' : 'none', 
          padding: isPipelineOpen ? '20px 16px' : '0', 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          opacity: isPipelineOpen ? 1 : 0, 
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <InvestigationPipeline />
          </div>
        </div>
        
        {/* Center Column (Map without culprit tracks) */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
          <div style={{ flex: 1, position: 'relative', height: '100%', width: '100%' }}>
            <MapWidget showVesselTracks={false} />
            
            {/* Map Crosshairs Overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 400 }}></div>
            
            {isFailed && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 500, background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
                <AlertTriangle size={32} color="var(--accent-red)" style={{ marginBottom: '16px' }} />
                <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Detection Unavailable</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '250px' }}>ML detection unavailable for this investigation. Contextual geometry cannot be rendered.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ background: 'var(--bg-sidebar)', borderLeft: isIntelligenceOpen ? '1px solid var(--border-color)' : 'none', padding: isIntelligenceOpen ? '24px' : '0', overflowY: 'auto', overflowX: 'hidden', opacity: isIntelligenceOpen ? 1 : 0, transition: 'all 0.3s ease' }}>
          <IntelligencePanel />
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <InvestigationProvider id={id}>
      <InvestigationWorkspace />
    </InvestigationProvider>
  );
}
