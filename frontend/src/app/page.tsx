"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import EnvironmentalConditions from '@/components/EnvironmentalConditions';
import SourceReconstruction from '@/components/SourceReconstruction';
import CandidateVesselsList from '@/components/CandidateVesselsList';
import IncidentTimeline from '@/components/IncidentTimeline';
import ObservationCards from '@/components/ObservationCards';
import { useDashboard } from '@/context/DashboardContext';
import { X, Maximize2 } from 'lucide-react';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapWidget = dynamic(() => import('@/components/MapWidget'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', background: 'var(--bg-base)' }}></div>
});

export default function Dashboard() {
  const { observationModalOpen, setObservationModalOpen } = useDashboard();

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
      
      {/* Background Map Layer (Z-Index 0) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapWidget />
      </div>

      {/* Scrollable UI Overlay Layer (Z-Index 10) */}
      {/* pointerEvents: 'none' allows map interaction. Users can scroll when hovering over panels. */}
      <div className="custom-scrollbar" style={{ 
        position: 'absolute', inset: 0, zIndex: 10, 
        overflowY: 'auto', overflowX: 'hidden',
        pointerEvents: 'none', 
        display: 'flex', flexDirection: 'column' 
      }}>
        
        {/* Sticky Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, pointerEvents: 'auto' }}>
          <Header />
        </div>

        {/* Content Wrapper */}
        <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', 
          padding: '24px 32px 32px 32px', gap: '32px',
          minHeight: '100vh' // Ensures there is always enough room to scroll if needed
        }}>
          
          {/* Top Section: Spacer + Right Sidebar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            
            {/* Empty space for Map clicking */}
            <div style={{ flex: 1, minHeight: '400px' }}></div>
            
            {/* Right Panel Stack */}
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '16px', pointerEvents: 'auto' }}>
              <EnvironmentalConditions />
              <SourceReconstruction />
              <CandidateVesselsList />
            </div>

          </div>

          {/* Spacer to push bottom section down */}
          <div style={{ flex: 1 }}></div>

          {/* Bottom Section: Timeline & Cards */}
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
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>SAR Observation: Sentinel-1</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: OBS-20260824-001 • 10:30 UTC</div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Maximize2 size={20} /></button>
                <button onClick={() => setObservationModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '24px', display: 'flex', gap: '24px' }}>
              <div style={{ flex: 2, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '4px', position: 'relative' }}>
                 {/* High-res image mock */}
                 <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)', backgroundSize: '4px 4px', opacity: 0.3 }}></div>
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ width: '40%', height: '30%', border: '2px solid var(--accent-red)', borderRadius: '40% 60% 70% 30%', opacity: 0.8, boxShadow: '0 0 20px rgba(239,68,68,0.5) inset' }}></div>
                 </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="tactical-panel" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Analysis Results</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Detected Area</span><span className="tactical-text">13.8 km²</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Confidence Score</span><span className="tactical-text" style={{ color: 'var(--accent-green)' }}>91%</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Algorithm</span><span className="tactical-text">ARGUS-DeepSAR v2.1</span></div>
                </div>
                <button style={{ width: '100%', padding: '12px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}>
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
