"use client";
import React, { useState } from 'react';
import Header from '@/components/Header';
import { Search, Filter, Ship, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapWidget = dynamic(() => import('@/components/MapWidget'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', background: 'var(--bg-base)' }}></div>
});

export default function VesselsPage() {
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);

  const vessels = [
    { name: 'Oceanic Pride', imo: '987654321', type: 'Crude Oil Tanker', status: 'Underway', speed: '14.1 kn', risk: 'High', anomaly: 'AIS Gap (2h)' },
    { name: 'Sea Voyager', imo: '123456789', type: 'Bulk Carrier', status: 'Moored', speed: '0.0 kn', risk: 'Low', anomaly: 'None' },
    { name: 'Global Trader', imo: '456789123', type: 'Container Ship', status: 'Underway', speed: '11.8 kn', risk: 'Medium', anomaly: 'Route Deviation' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        {/* Left Side: Fleet List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px', maxWidth: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>Fleet Tracking</h1>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="tactical-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '8px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input type="text" placeholder="Search IMO, MMSI, Name..." style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }} />
            </div>
            <button className="tactical-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Filter size={16} /> Filter
            </button>
          </div>

          <div className="tactical-panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {vessels.map(v => (
              <div 
                key={v.imo}
                onClick={() => setSelectedVessel(v.imo)}
                style={{ 
                  padding: '16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                  background: selectedVessel === v.imo ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Ship size={16} color={v.risk === 'High' ? 'var(--accent-red)' : 'var(--accent-blue)'} />
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</span>
                  </div>
                  <span className="tactical-text" style={{ color: 'var(--text-secondary)' }}>IMO: {v.imo}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>{v.type} • {v.status} ({v.speed})</span>
                </div>

                {v.anomaly !== 'None' && (
                  <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '4px' }}>
                    <AlertTriangle size={12} color="var(--accent-red)" />
                    <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>{v.anomaly}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Map */}
        <div className="tactical-panel" style={{ flex: 2, position: 'relative', overflow: 'hidden' }}>
           <MapWidget />
           <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'var(--bg-panel)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', zIndex: 1000 }}>
             <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Live Fleet Status</div>
             <div className="tactical-text" style={{ fontSize: '24px', color: 'var(--text-primary)', fontWeight: 600 }}>1,204</div>
             <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Vessels in Region</div>
           </div>
        </div>

      </div>
    </div>
  );
}
