"use client";
import React, { use, useState } from 'react';
import dynamic from 'next/dynamic';
import { InvestigationProvider, useInvestigation } from '@/context/InvestigationContext';

const MapWidget = dynamic(() => import('@/components/MapWidget'), { ssr: false });

import { Loader2, AlertTriangle, Play, Download, Clock, Bell, MoreVertical, RefreshCw, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import Link from 'next/link';
import InvestigationPipeline from '@/components/InvestigationPipeline';
import IntelligencePanel from '@/components/IntelligencePanel';

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
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '1px' }}>INITIALIZING WORKSTATION...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--bg-base)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{error || 'Investigation not found'}</div>
          <Link href="/investigations" style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
             Back to Investigations
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
        borderBottom: '1px solid var(--border-color)', 
        background: 'var(--bg-sidebar)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setIsPipelineOpen(!isPipelineOpen)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 0
            }}
            title={isPipelineOpen ? "Hide Pipeline" : "Show Pipeline"}
          >
            {isPipelineOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Maritime Intelligence Station
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Investigation Workstation
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/</div>
          <div style={{ fontSize: '14px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {data.investigation._id.substring(0,12).toUpperCase()}
          </div>
          <div style={{ 
            marginLeft: '16px', padding: '4px 12px', border: `1px solid ${isFailed ? 'var(--accent-red)' : 'var(--accent-green)'}`, 
            borderRadius: '20px', fontSize: '10px', color: isFailed ? 'var(--accent-red)' : 'var(--accent-green)', 
            display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, background: isFailed ? 'rgba(244,67,54,0.1)' : 'rgba(34,197,94,0.1)'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
            {isFailed ? 'FAILED' : invStatus}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isFailed ? (
            <button 
              onClick={async () => {
                await fetch(`http://localhost:8080/api/investigations/${data.investigation._id}/analyze`, { method: 'POST' });
                refresh();
              }}
              style={{ padding: '8px 16px', background: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <RefreshCw size={14} /> Retry Analysis
            </button>
          ) : (
            <button style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Play size={14} /> REPLAY INCIDENT
            </button>
          )}
          <button style={{ padding: '8px 16px', background: isFailed ? 'transparent' : 'var(--accent-cyan)', border: isFailed ? '1px solid var(--border-color)' : 'none', color: isFailed ? 'var(--text-secondary)' : '#000', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            {isFailed ? 'Export Log' : <><Download size={14} /> EXPORT REPORT</>}
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>
          <Clock size={18} color="var(--text-muted)" />
          <Bell size={18} color="var(--text-muted)" />
          <button 
            onClick={() => setIsIntelligenceOpen(!isIntelligenceOpen)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
            title={isIntelligenceOpen ? "Hide Intelligence" : "Show Intelligence"}
          >
            {isIntelligenceOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
          <MoreVertical size={18} color="var(--text-muted)" />
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `${isPipelineOpen ? '320px' : '0px'} 1fr ${isIntelligenceOpen ? '380px' : '0px'}`, overflow: 'hidden', transition: 'grid-template-columns 0.3s ease' }}>
        
        {/* Left Column */}
        <div style={{ background: 'var(--bg-sidebar)', borderRight: isPipelineOpen ? '1px solid var(--border-color)' : 'none', padding: isPipelineOpen ? '24px' : '0', overflowY: 'auto', overflowX: 'hidden', opacity: isPipelineOpen ? 1 : 0, transition: 'all 0.3s ease' }}>
          <InvestigationPipeline />
        </div>
        
        {/* Center Column (Map & Timeline) */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <MapWidget />
            
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

          {/* Evidence Fusion Timeline */}
          <div style={{ height: '80px', minHeight: '80px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>EVIDENCE FUSION TIMELINE (UTC-48H)</div>
              <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                CURRENT: {timestamp.toUTCString().replace('GMT', 'UTC').toUpperCase()}
              </div>
            </div>
            <div style={{ position: 'relative', height: '2px', background: 'var(--border-color)', marginTop: '8px' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80%', background: 'var(--accent-cyan)' }}></div>
              <div style={{ position: 'absolute', left: '20%', top: '-6px', width: '2px', height: '14px', background: '#fff' }}></div>
              <div style={{ position: 'absolute', left: '20%', top: '10px', fontSize: '10px', color: 'var(--text-muted)', transform: 'translateX(-50%)' }}>T-48h</div>
              <div style={{ position: 'absolute', left: '50%', top: '-6px', width: '2px', height: '14px', background: '#fff' }}></div>
              <div style={{ position: 'absolute', left: '50%', top: '10px', fontSize: '10px', color: 'var(--text-muted)', transform: 'translateX(-50%)' }}>Spill Est.</div>
              <div style={{ position: 'absolute', left: '80%', top: '-10px', width: '12px', height: '20px', border: '2px solid var(--accent-cyan)', background: 'var(--bg-base)', transform: 'translateX(-50%)' }}></div>
              <div style={{ position: 'absolute', left: '80%', top: '12px', fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 600, transform: 'translateX(-50%)' }}>Detection</div>
            </div>
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
