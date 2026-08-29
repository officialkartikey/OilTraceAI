"use client";
import React from 'react';
import Header from '@/components/Header';
import { Link, CheckCircle, Database, Ship } from 'lucide-react';

export default function EvidencePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>Evidence Fusion Workspace</h1>
          <button style={{ padding: '8px 16px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
            Generate Attribution Package
          </button>
        </div>

        <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
          
          {/* Left: Observations Pool */}
          <div className="tactical-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={14} /> Observations (Unlinked)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--border-color)', borderRadius: '4px', cursor: 'grab' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>OBS-098: Drone Footage</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Location: 18.9°N 72.7°E</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--border-color)', borderRadius: '4px', cursor: 'grab' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>OBS-096: Coast Guard Report</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Notes: Strong odor reported</div>
              </div>
            </div>
          </div>

          {/* Center: Fusion Graph (Mock) */}
          <div className="tactical-panel" style={{ flex: 2, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', top: '16px', left: '16px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Relational Graph
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              
              {/* Linked Observation */}
              <div style={{ width: '150px', padding: '16px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>OBS-101</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>SAR Detection</div>
              </div>
              
              {/* Link Line */}
              <div style={{ height: '2px', width: '100px', background: 'var(--accent-red)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-panel)', padding: '2px 4px', fontSize: '9px', color: 'var(--accent-red)' }}>
                  91% Match
                </div>
              </div>

              {/* Suspect Vessel */}
              <div style={{ width: '150px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Oceanic Pride</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>IMO: 987654321</div>
              </div>

            </div>
          </div>

          {/* Right: Candidate Vessels */}
          <div className="tactical-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ship size={14} /> Targets
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Oceanic Pride</div>
                  <CheckCircle size={14} color="var(--accent-green)" />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>2 Links Established</div>
              </div>
              
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Sea Voyager</div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>0 Links Established</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
