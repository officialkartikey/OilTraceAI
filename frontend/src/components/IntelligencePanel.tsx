import React from 'react';
import { Settings2, Link as LinkIcon, Maximize2 } from 'lucide-react';
import { useInvestigation } from '@/context/InvestigationContext';

export default function IntelligencePanel() {
  const { data } = useInvestigation();
  if (!data) return null;

  const invStatus = data.investigation.status;
  const isFailed = invStatus === 'FAILED';
  
  const suspects = data.candidates || []; // actually it's candidates from backend, wait, data.candidates? 
  const topSuspect = suspects[0];
  const otherSuspects = suspects.slice(1, 3);
  const imageUrl = data.observation?.image_reference || '';

  if (isFailed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Processing State
          </h2>
          <Settings2 size={16} color="var(--text-muted)" />
        </div>
        
        {/* Failed Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ border: '1px solid var(--border-color)', background: 'rgba(244,67,54,0.05)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DETECTION</div>
              <div style={{ fontSize: '10px', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', padding: '2px 6px' }}>FAILED</div>
            </div>
            <div className="tactical-text" style={{ color: 'var(--accent-red)' }}>Exit Code: 1 (Timeout)</div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>RECONSTRUCTION</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Awaiting inputs</div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '8px 12px' }}>NOT<br/>AVAILABLE</div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AIS<br/>CORRELATION</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Awaiting inputs</div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '8px 12px' }}>NOT<br/>AVAILABLE</div>
          </div>
        </div>

        {/* Source Material */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Source Material</div>
            <LinkIcon size={14} color="var(--text-muted)" />
          </div>
          <div style={{ 
            height: '240px', border: '1px solid var(--border-color)', background: '#111', 
            position: 'relative', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ flex: 1, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(1)' }}></div>
            <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <div style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>SAR_VV_GRD<br/><span style={{ color: 'var(--text-muted)' }}>512x512px RAW</span></div>
              <Maximize2 size={14} color="var(--accent-cyan)" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completed State Layout
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Intelligence
        </h2>
        <Settings2 size={16} color="var(--text-muted)" />
      </div>

      {/* Primary Attribution */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>PRIMARY ATTRIBUTION</div>
        <div style={{ border: '1px solid var(--accent-cyan)', padding: '16px', background: 'rgba(0, 210, 211, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--accent-cyan)', borderRadius: '50%' }}></div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{topSuspect?.vessel?.name || 'Unknown Vessel'}</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>MMSI: {topSuspect?.vessel?.mmsi || '----'}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>PROBABILITY</div>
              <div className="tactical-text" style={{ color: 'var(--accent-cyan)', fontSize: '14px' }}>{((topSuspect?.attribution_score || 0) * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>TYPE</div>
              <div className="tactical-text" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{topSuspect?.vessel?.vessel_type || 'Unknown'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>SPEED</div>
              <div className="tactical-text" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{(topSuspect?.vessel as any)?.positions?.[0]?.speed ? (topSuspect.vessel as any).positions[0].speed.toFixed(1) : '--'} kts</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>HEADING</div>
              <div className="tactical-text" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{(topSuspect?.vessel as any)?.positions?.[0]?.heading ? (topSuspect.vessel as any).positions[0].heading.toFixed(0) : '--'}°</div>
            </div>
          </div>

          <button style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer' }}>
            VIEW DOSSIER
          </button>
        </div>
      </div>

      {/* Environmental Data */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>ENVIRONMENTAL DATA</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Wind</div>
            <div className="tactical-text" style={{ color: 'var(--accent-cyan)' }}>12.4 m/s NE</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed var(--border-color)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current</div>
            <div className="tactical-text" style={{ color: 'var(--text-primary)' }}>1.2 kts NW</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Temp</div>
            <div className="tactical-text" style={{ color: 'var(--text-primary)' }}>28°C</div>
          </div>
        </div>
      </div>

      {/* Other Candidates */}
      {otherSuspects.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>OTHER CANDIDATES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {otherSuspects.map((v: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{v?.vessel?.name || 'Unknown'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MMSI: {v?.vessel?.mmsi || '----'}</div>
                </div>
                <div className="tactical-text" style={{ color: 'var(--accent-orange)' }}>{((v?.attribution_score || 0) * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
