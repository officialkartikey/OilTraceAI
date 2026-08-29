import React from 'react';
import { AlertTriangle, MapPin, Anchor } from 'lucide-react';

const suspects = [
  { id: 'MMSI-987654321', name: 'Oceanic Pride', type: 'Oil Tanker', confidence: 94, flag: 'LR', anomaly: 'AIS Shutdown (2h)' },
  { id: 'MMSI-123456789', name: 'Sea Voyager', type: 'Cargo', confidence: 82, flag: 'PA', anomaly: 'Erratic Speed' },
  { id: 'MMSI-456789123', name: 'Global Trader', type: 'Bulk Carrier', confidence: 65, flag: 'MH', anomaly: 'None' },
  { id: 'MMSI-789123456', name: 'Pacific Pearl', type: 'Container', confidence: 45, flag: 'SG', anomaly: 'None' },
];

export default function Leaderboard() {
  return (
    <div className="glass animate-fade-in" style={{ padding: '24px', animationDelay: '0.2s', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Anchor size={20} color="var(--primary)" />
          Suspect Vessel Leaderboard
        </h2>
        <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px' }}>
          View All
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
        {suspects.map((vessel, index) => (
          <div key={vessel.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: index === 0 ? 'rgba(239,68,68,0.2)' : index === 1 ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.05)',
                color: index === 0 ? 'var(--danger)' : index === 1 ? '#eab308' : 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px'
              }}>
                #{index + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{vessel.name} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>({vessel.flag})</span></div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Anchor size={12} /> {vessel.type}</span>
                  <span>{vessel.id}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {vessel.anomaly !== 'None' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                  <AlertTriangle size={14} />
                  {vessel.anomaly}
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Confidence Score</div>
                <div style={{
                  fontSize: '18px', fontWeight: 700,
                  color: vessel.confidence > 80 ? 'var(--danger)' : vessel.confidence > 60 ? '#eab308' : 'var(--accent)'
                }}>
                  {vessel.confidence}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
