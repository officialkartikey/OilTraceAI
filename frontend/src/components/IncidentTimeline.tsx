import { Play, Calendar, Pause } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useState } from 'react';

export default function IncidentTimeline() {
  const { currentTime, setCurrentTime } = useDashboard();
  const [isPlaying, setIsPlaying] = useState(false);

  const events = [
    { time: '08:15', label: 'Vessel Activity\nDetected' },
    { time: '09:02', label: 'Anomaly\nDetected' },
    { time: '09:37', label: 'Slick\nDetected' },
    { time: '10:30', label: 'Current\nObservation' },
    { time: '11:08', label: 'Reconstruction\nComplete' },
    { time: '11:45', label: 'Attribution\nGenerated' },
  ];

  return (
    <div className="tactical-panel" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
      
      {/* Title & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Incident Timeline
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ 
              background: isPlaying ? 'rgba(14, 165, 233, 0.2)' : 'transparent', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px', padding: '6px', 
              color: isPlaying ? 'var(--accent-blue)' : 'var(--text-primary)', 
              cursor: 'pointer', transition: 'all 0.2s' 
            }}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <select style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
            <option value="1x">1x</option>
            <option value="2x">2x</option>
            <option value="5x">5x</option>
          </select>
        </div>
      </div>

      {/* Timeline Track */}
      <div style={{ flex: 1, position: 'relative', height: '60px', display: 'flex', alignItems: 'center' }}>
        {/* Horizontal Line */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '24px', height: '1px', background: 'var(--border-color)' }}></div>
        
        {/* Timeline Events */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'relative', zIndex: 2 }}>
          {events.map((ev, i) => {
            // Determine status based on currentTime string comparison (simplistic approach for demo)
            const isCurrent = ev.time === currentTime;
            const isPast = ev.time < currentTime;
            const isFuture = ev.time > currentTime;

            return (
              <div 
                key={i} 
                onClick={() => setCurrentTime(ev.time)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
              >
                <div className="tactical-text" style={{ position: 'absolute', top: '-24px', color: isFuture ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                  {ev.time}
                </div>
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: isCurrent ? 'var(--accent-red)' : isPast ? 'var(--accent-blue)' : 'var(--bg-panel)',
                  border: isCurrent ? '2px solid rgba(239, 68, 68, 0.4)' : isPast ? 'none' : '1px solid var(--border-color)',
                  boxShadow: isCurrent ? '0 0 10px rgba(239,68,68,0.8)' : 'none',
                  marginTop: '20px',
                  transition: 'all 0.3s'
                }}></div>
                <div style={{ 
                  position: 'absolute', top: '36px',
                  fontSize: '10px', color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                  textAlign: 'center', width: '80px', lineHeight: 1.2
                }}>
                  {ev.label.split('\n').map((line, idx) => <div key={idx}>{line}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Icon */}
      <div>
        <button style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Calendar size={16} />
        </button>
      </div>

    </div>
  );
}
