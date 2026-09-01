import { ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useInvestigation } from '@/context/InvestigationContext';

export default function ObservationCards() {
  const { data, setObservationModalOpen } = useInvestigation();
  
  if (!data) return null;

  const observation = data.observation;
  const detection = data.detection;
  const suspects = data.attribution?.suspects || [];
  const imageUrl = observation?.image_file || '';
  
  const timestamp = observation?.timestamp ? new Date(observation.timestamp) : new Date();
  const dateStr = timestamp.toISOString().substring(0, 10);
  const timeStr = timestamp.toISOString().substring(11, 16);
  
  const area = detection?.area_pct || '--';

  const chartData = [
    { time: 'T-120', probability: 0.1 },
    { time: 'T-90', probability: 0.15 },
    { time: 'T-60', probability: 0.35 },
    { time: 'T-30', probability: 0.75 },
    { time: 'T-0', probability: suspects[0]?.suspect_score || 0.87 },
  ];

  return (
    <div className="custom-scrollbar" style={{ 
      display: 'flex', 
      gap: '16px', 
      overflowX: 'auto', 
      paddingBottom: '8px',
      width: '100%' 
    }}>
      
      {/* Latest Observation */}
      <div className="tactical-panel" style={{ minWidth: '260px', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Latest Observation
        </h3>
        <div style={{ 
          flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', 
          marginBottom: '12px', position: 'relative', overflow: 'hidden'
        }}>
          {/* Actual SAR Image */}
          {imageUrl && (
            <div style={{ 
              position: 'absolute', inset: 0, 
              backgroundImage: `url(${imageUrl})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center',
              filter: 'contrast(1.2) brightness(0.8)'
            }}></div>
          )}
          
          {/* Tactical Overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
          
          {/* Detection outline */}
          {detection?.slick_detected && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '45%', height: '35%', border: '1px solid var(--accent-yellow)', borderRadius: '30% 70% 60% 40%', boxShadow: '0 0 10px rgba(234, 179, 8, 0.3) inset', transform: 'rotate(-15deg)' }}></div>
            </div>
          )}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{observation?.satellite || 'Unknown Satellite'}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>{dateStr} • {timeStr} UTC</div>
        <div 
          onClick={() => setObservationModalOpen(true)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', cursor: 'pointer', padding: '4px 0' }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <span style={{ fontSize: '11px', color: 'inherit' }}>View Observation</span>
          <ArrowRight size={14} color="inherit" />
        </div>
      </div>

      {/* Slick Evolution */}
      <div className="tactical-panel" style={{ minWidth: '260px', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Slick Evolution (Hindcast)
        </h3>
        <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
          {['T-120', 'T-90', 'T-60', 'T-30', 'T-0'].map((time, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '100%', aspectRatio: '1', background: '#111', border: '1px solid var(--border-color)', borderRadius: '4px',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', inset: 0, 
                  backgroundImage: imageUrl ? `url(${imageUrl})` : undefined, 
                  backgroundSize: `${300 - (i * 20)}%`, // Simulating zooming out over time
                  backgroundPosition: `${50 + (i * 5)}% 50%`, // Simulating drift over time
                  filter: `contrast(1.2) brightness(${0.5 + (i * 0.1)})`
                }}></div>
                {/* Evolution outline growing */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ width: `${30 + i * 15}%`, height: `${20 + i * 10}%`, border: '1px solid rgba(234, 179, 8, 0.7)', borderRadius: '40% 60% 70% 30%', transform: `rotate(${-10 - (i * 2)}deg)` }}></div>
                </div>
              </div>
              <span className="tactical-text" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{time}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>View Full Evolution</span>
          <ArrowRight size={14} color="var(--text-secondary)" />
        </div>
      </div>

      {/* Source Probability */}
      <div className="tactical-panel" style={{ minWidth: '260px', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Source Probability Over Time
        </h3>
        <div style={{ position: 'relative', flex: 1 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Top Suspect Probability</div>
            <div className="tactical-text" style={{ fontSize: '20px', color: 'var(--accent-red)', fontWeight: 600 }}>{suspects[0]?.suspect_score?.toFixed(2) || '0.00'}</div>
          </div>
          <div style={{ width: '100%', height: '100px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 1]} />
                <Line type="monotone" dataKey="probability" stroke="var(--accent-red)" strokeWidth={2} dot={{ r: 3, fill: 'var(--bg-panel)', stroke: 'var(--accent-red)' }} />
                <ReferenceLine y={suspects[0]?.suspect_score || 0.87} stroke="var(--accent-red)" strokeDasharray="3 3" opacity={0.3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Investigation Summary */}
      <div className="tactical-panel" style={{ minWidth: '260px', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
          Investigation Summary
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Observed Area</span>
            <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>{area} km²</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Observation Time</span>
            <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>{dateStr}, {timeStr} UTC</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reconstruction Window</span>
            <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>120 min</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Candidate Vessels</span>
            <span className="tactical-text" style={{ color: 'var(--text-primary)' }}>{suspects.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>High Risk Candidates</span>
            <span className="tactical-text" style={{ color: 'var(--accent-red)' }}>{suspects.filter((s:any) => (s.score||0) > 0.8).length}</span>
          </div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => {
              if (data.investigation.id) {
                window.open(`/api/analysis/report/${data.investigation.id}`, '_blank');
              }
            }}
            style={{ 
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', 
              borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', fontSize: '11px', cursor: 'pointer' 
            }}
          >
            Open Full Report
          </button>
        </div>
      </div>

    </div>
  );
}
