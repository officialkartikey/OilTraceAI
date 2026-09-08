"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Search, Filter, MoreVertical, ArrowRight, ShieldAlert, Loader2 } from 'lucide-react';
import { investigationsApi } from '@/lib/api/investigations';
import { ActiveSpill } from '@/lib/api/types';

export default function InvestigationsPage() {
  const router = useRouter();
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [investigations, setInvestigations] = useState<ActiveSpill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpills = async () => {
      try {
        setLoading(true);
        const data = await investigationsApi.getActiveSpills();
        setInvestigations(data);
        if (data.length > 0) {
          setSelectedRow(data[0].id);
        }
      } catch (err: any) {
        setError('Backend unavailable. ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSpills();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flex: 1, padding: '80px 32px 32px 32px', gap: '24px', overflowY: 'auto' }} className="custom-scrollbar">
        
        {/* Left Table Section */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-primary)' }}>Investigations</h1>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="tactical-panel" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '8px', background: 'var(--input-bg)' }}>
                <Search size={16} color="var(--text-muted)" />
                <input type="text" placeholder="Search ID, Location..." style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }} />
              </div>
              <button className="tactical-panel" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--input-bg)' }}>
                <Filter size={15} /> Filter
              </button>
            </div>
          </div>

          <div className="tactical-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1fr 1fr 0.5fr', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', background: 'var(--table-header-bg)', fontWeight: 700 }}>
              <div>ID</div>
              <div>Date</div>
              <div>Location</div>
              <div>Type</div>
              <div>Status</div>
              <div></div>
            </div>

            {/* Table Body */}
            <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
              {loading ? (
                <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : error ? (
                <div style={{ padding: '32px', color: 'var(--accent-red)', textAlign: 'center' }}>
                  {error}
                </div>
              ) : investigations.length === 0 ? (
                <div style={{ padding: '32px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No active investigations found.
                </div>
              ) : (
                investigations.map((inv) => (
                  <div 
                    key={inv.id}
                    onClick={() => setSelectedRow(inv.id)}
                    style={{ 
                      display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1fr 1fr 0.5fr', padding: '14px 16px', 
                      borderBottom: '1px solid var(--border-subtle)',
                      background: selectedRow === inv.id ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      alignItems: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => { if (selectedRow !== inv.id) e.currentTarget.style.background = 'var(--table-row-hover)' }}
                    onMouseOut={(e) => { if (selectedRow !== inv.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div className="tactical-text" style={{ color: selectedRow === inv.id ? 'var(--accent-blue)' : 'var(--text-primary)', fontWeight: 600 }}>{inv.id}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(inv.detectedAt).toISOString().substring(0, 16).replace('T', ' ')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{inv.currentLocation.lat.toFixed(2)}°N {inv.currentLocation.lng.toFixed(2)}°E</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SAR Detection</div>
                    <div>
                      <span className={inv.status === 'ACTIVE' ? 'badge-active tactical-badge' : inv.status === 'VERIFYING' ? 'badge-verifying tactical-badge' : 'badge-neutral tactical-badge'}>
                        {inv.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <MoreVertical size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Details Panel */}
        {selectedRow && investigations.length > 0 && (
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
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{new Date(inv.detectedAt).toISOString().substring(0, 16).replace('T', ' ')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{inv.status}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Priority</div>
                      <div style={{ fontSize: '14px', color: inv.status === 'ACTIVE' ? 'var(--accent-red)' : 'var(--text-primary)' }}>High</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Type</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>SAR Detection</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, minHeight: '160px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
                     {/* Mini Map Placeholder */}
                     <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, var(--border-color) 1px, transparent 1px)', backgroundSize: '12px 12px', opacity: 0.6 }}></div>
                     <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Active Geo Theater</span>
                     </div>
                  </div>

                  <button 
                    onClick={() => router.push(`/investigations/${inv.id}`)}
                    style={{ 
                      width: '100%', padding: '12px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '6px',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 600, transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
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

