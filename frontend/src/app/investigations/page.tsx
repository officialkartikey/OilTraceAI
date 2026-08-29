"use client";
import React, { useState } from 'react';
import Header from '@/components/Header';
import { Search, Filter, MoreVertical, ArrowRight, ShieldAlert } from 'lucide-react';

export default function InvestigationsPage() {
  const [selectedRow, setSelectedRow] = useState<string | null>('IN-2026-08-24-1030');

  const investigations = [
    { id: 'IN-2026-08-24-1030', date: '2026-08-24 10:30', location: 'Arabian Sea, 19.1°N 72.9°E', type: 'Oil Spill', status: 'Active', priority: 'High', area: '13.8 km²' },
    { id: 'IN-2026-08-23-0915', date: '2026-08-23 09:15', location: 'Bay of Bengal, 14.5°N 83.2°E', type: 'Bilge Dump', status: 'Analysis', priority: 'Medium', area: '4.2 km²' },
    { id: 'IN-2026-08-20-1422', date: '2026-08-20 14:22', location: 'Laccadive Sea, 9.8°N 76.1°E', type: 'Unknown Anomaly', status: 'Closed', priority: 'Low', area: '1.1 km²' },
    { id: 'IN-2026-08-18-1100', date: '2026-08-18 11:00', location: 'Andaman Sea, 11.2°N 92.5°E', type: 'Oil Spill', status: 'Closed', priority: 'High', area: '22.5 km²' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        {/* Left Table Section */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>Investigations</h1>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="tactical-panel" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '8px' }}>
                <Search size={16} color="var(--text-muted)" />
                <input type="text" placeholder="Search ID, Location..." style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }} />
              </div>
              <button className="tactical-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <Filter size={16} /> Filter
              </button>
            </div>
          </div>

          <div className="tactical-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1fr 1fr 0.5fr', padding: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <div>ID</div>
              <div>Date</div>
              <div>Location</div>
              <div>Type</div>
              <div>Status</div>
              <div></div>
            </div>

            {/* Table Body */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {investigations.map((inv) => (
                <div 
                  key={inv.id}
                  onClick={() => setSelectedRow(inv.id)}
                  style={{ 
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1fr 1fr 0.5fr', padding: '16px', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: selectedRow === inv.id ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => { if (selectedRow !== inv.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseOut={(e) => { if (selectedRow !== inv.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="tactical-text" style={{ color: selectedRow === inv.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{inv.id}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{inv.date}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{inv.location}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{inv.type}</div>
                  <div>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '11px',
                      background: inv.status === 'Active' ? 'rgba(239, 68, 68, 0.2)' : inv.status === 'Analysis' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: inv.status === 'Active' ? 'var(--accent-red)' : inv.status === 'Analysis' ? 'var(--accent-yellow)' : 'var(--text-secondary)'
                    }}>
                      {inv.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <MoreVertical size={16} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Details Panel */}
        {selectedRow && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const inv = investigations.find(i => i.id === selectedRow);
              if (!inv) return null;
              
              return (
                <div className="tactical-panel animate-fade-in" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Investigation Details</div>
                      <h2 className="tactical-text" style={{ fontSize: '20px', color: 'var(--text-primary)' }}>{inv.id}</h2>
                    </div>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '8px', 
                      background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <ShieldAlert size={20} color="var(--accent-red)" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Date / Time</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{inv.date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{inv.status}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Priority</div>
                      <div style={{ fontSize: '14px', color: inv.priority === 'High' ? 'var(--accent-red)' : 'var(--text-primary)' }}>{inv.priority}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Observed Area</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{inv.area}</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
                     {/* Mini Map Placeholder */}
                     <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)', backgroundSize: '10px 10px', opacity: 0.3 }}></div>
                     <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Map View</span>
                     </div>
                  </div>

                  <button style={{ 
                    width: '100%', padding: '12px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '4px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600
                  }}>
                    Open in Tactical View <ArrowRight size={16} />
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
