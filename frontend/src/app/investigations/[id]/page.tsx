"use client";
import React, { use } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import EnvironmentalConditions from '@/components/EnvironmentalConditions';
import SourceReconstruction from '@/components/SourceReconstruction';
import CandidateVesselsList from '@/components/CandidateVesselsList';
import IncidentTimeline from '@/components/IncidentTimeline';
import ObservationCards from '@/components/ObservationCards';
import { InvestigationProvider, useInvestigation } from '@/context/InvestigationContext';
import { X, Maximize2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapWidget = dynamic(() => import('@/components/MapWidget'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', background: 'var(--bg-base)' }}></div>
});

function InvestigationWorkspace() {
  const { 
    data, loading, error, 
    observationModalOpen, setObservationModalOpen,
    selectedVessel
  } = useInvestigation();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <div className="text-gray-400">Loading investigation workspace...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div className="text-red-500">{error || 'Investigation not found'}</div>
          <Link href="/investigations" className="text-blue-400 flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Investigations
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = data.observation?.image_file || '';
  const timestamp = data.observation?.timestamp ? new Date(data.observation.timestamp) : new Date();

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
      
      {/* Background Map Layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapWidget 
          investigationData={data} 
          selectedVessel={selectedVessel}
          activeAlert={{ 
            _id: data.observation.id, 
            observation_id: data.observation.id, 
            timestamp: data.observation.timestamp,
            satellite: data.observation.satellite,
            image_file: data.observation.image_file,
            detection: data.detection 
          }} 
        />
      </div>

      {/* Scrollable UI Overlay Layer */}
      <div className="custom-scrollbar" style={{ 
        position: 'absolute', inset: 0, zIndex: 10, 
        overflowY: 'auto', overflowX: 'hidden',
        pointerEvents: 'none', 
        display: 'flex', flexDirection: 'column' 
      }}>
        
        {/* Sticky Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, pointerEvents: 'auto' }}>
          <Header title={`Investigation ${data.investigation.id}`} backLink="/investigations" />
        </div>

        {/* Content Wrapper */}
        <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', 
          padding: '80px 32px 32px 32px', gap: '32px',
          minHeight: '100vh'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minHeight: '400px' }}></div>
            
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '16px', pointerEvents: 'auto' }}>
              <EnvironmentalConditions />
              <SourceReconstruction />
              <CandidateVesselsList />
            </div>
          </div>

          <div style={{ flex: 1 }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', pointerEvents: 'auto', width: '100%' }}>
            <IncidentTimeline />
            <ObservationCards />
          </div>
        </div>
      </div>

      {/* Observation Modal Overlay */}
      {observationModalOpen && (
        <div className="animate-fade-in" style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'
        }}>
          <div className="tactical-panel" style={{ width: '100%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>SAR Observation: {data.observation?.satellite || 'Sentinel-1'}</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {data.observation?.id} • {timestamp.toISOString().substring(11, 16)} UTC</div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Maximize2 size={20} /></button>
                <button onClick={() => setObservationModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '24px', display: 'flex', gap: '24px' }}>
              <div style={{ flex: 2, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                 {imageUrl ? (
                   <img src={imageUrl} alt="SAR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                 ) : (
                   <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)', backgroundSize: '4px 4px', opacity: 0.3 }}></div>
                 )}
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ width: '40%', height: '30%', border: '2px solid var(--accent-yellow)', borderRadius: '40% 60% 70% 30%', opacity: 0.8, boxShadow: '0 0 20px rgba(234,179,8,0.5) inset' }}></div>
                 </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="tactical-panel" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Analysis Results</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Detected Area</span><span className="tactical-text">{data.detection?.area_pct || '--'} km²</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Confidence Score</span><span className="tactical-text" style={{ color: 'var(--accent-green)' }}>{(data.detection?.confidence * 100).toFixed(1)}%</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Algorithm</span><span className="tactical-text">Kairos-DeepSAR v2.1</span></div>
                </div>
                <button 
                  onClick={() => window.open(`/api/analysis/report/${data.investigation.id}`, '_blank')}
                  style={{ width: '100%', padding: '12px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}>
                  Generate Forensics Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
