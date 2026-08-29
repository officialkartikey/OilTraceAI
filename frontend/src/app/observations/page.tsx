"use client";
import React, { useState } from 'react';
import Header from '@/components/Header';
import { Upload, Image as ImageIcon, Crosshair, Filter, Calendar } from 'lucide-react';

export default function ObservationsPage() {
  const [dragActive, setDragActive] = useState(false);

  const observations = [
    { id: 'OBS-101', type: 'SAR (Sentinel-1)', date: '24 Aug 2026 10:30', location: '19.1°N 72.9°E', thumb: 'rad1' },
    { id: 'OBS-100', type: 'Optical (Sentinel-2)', date: '24 Aug 2026 06:15', location: '19.1°N 72.9°E', thumb: 'opt1' },
    { id: 'OBS-099', type: 'SAR (Sentinel-1)', date: '23 Aug 2026 22:10', location: '19.0°N 72.8°E', thumb: 'rad2' },
    { id: 'OBS-098', type: 'Drone Footage', date: '23 Aug 2026 14:00', location: '18.9°N 72.7°E', thumb: 'dro1' },
    { id: 'OBS-097', type: 'SAR (Sentinel-1)', date: '22 Aug 2026 10:30', location: '18.5°N 72.5°E', thumb: 'rad3' },
    { id: 'OBS-096', type: 'Field Report', date: '22 Aug 2026 08:00', location: 'Coast Guard Vessel', thumb: 'rep1' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>Observations</h1>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="tactical-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Calendar size={16} /> Last 7 Days
            </button>
            <button className="tactical-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
          
          {/* Main Gallery */}
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', overflowY: 'auto' }}>
              {observations.map((obs) => (
                <div key={obs.id} className="tactical-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '10px 10px', opacity: 0.5 }}></div>
                    {obs.type.includes('SAR') && (
                      <div style={{ position: 'absolute', inset: '10%', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '20% 40% 30% 50%', boxShadow: '0 0 10px rgba(239,68,68,0.2) inset' }}></div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="tactical-text" style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{obs.id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{obs.type}</div>
                    </div>
                    <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {obs.type.includes('SAR') ? <Crosshair size={14} color="var(--accent-red)" /> : <ImageIcon size={14} color="var(--text-secondary)" />}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{obs.date}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{obs.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Sidebar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="tactical-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Ingest New Observation</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Upload SAR imagery, drone footage, or field reports for analysis.</p>
              
              <div 
                style={{ 
                  flex: 1, 
                  border: `2px dashed ${dragActive ? 'var(--accent-blue)' : 'var(--border-color)'}`, 
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: dragActive ? 'rgba(14, 165, 233, 0.05)' : 'rgba(0,0,0,0.2)',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDrop={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
              >
                <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Upload size={24} color={dragActive ? 'var(--accent-blue)' : 'var(--text-secondary)'} />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
                  Drag & drop files here
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Supported formats: GeoTIFF, NITF, MP4, PDF
                </div>
                
                <button style={{ 
                  marginTop: '24px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                }}>
                  Browse Files
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
