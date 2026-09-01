import { Play, Calendar, Pause } from 'lucide-react';
import { useInvestigation } from '@/context/InvestigationContext';
import { useState } from 'react';

export default function IncidentTimeline() {
  const { data, selectedTime, setSelectedTime } = useInvestigation();
  const [isPlaying, setIsPlaying] = useState(false);

  const observation = data?.observation;
  
  const generateEvents = () => {
    if (!observation?.timestamp) return [];
    
    try {
      const dt = new Date(observation.timestamp);
      
      const formatTime = (d: Date) => d.toISOString().substring(11, 16);
      
      const dtMinus1 = new Date(dt.getTime() - 60 * 60000);
      const dtPlus1 = new Date(dt.getTime() + 30 * 60000);
      const dtPlus2 = new Date(dt.getTime() + 60 * 60000);

      return [
        { time: formatTime(dtMinus1), label: 'Vessel Activity\nHindcast' },
        { time: formatTime(dt), label: 'Slick\nDetected' },
        { time: formatTime(dtPlus1), label: 'Reconstruction\nComplete' },
        { time: formatTime(dtPlus2), label: 'Attribution\nGenerated' },
      ];
    } catch {
      return [];
    }
  };

  const events = generateEvents();

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
          {events.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No timeline data available.</div>
          )}
          {events.map((ev, i) => {
            const isCurrent = selectedTime === ev.time || (!selectedTime && i === 1); 
            const isPast = i < 1;
            const isFuture = i > 1;

            return (
              <div 
                key={i} 
                onClick={() => setSelectedTime(ev.time)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
              >
                <div className="tactical-text" style={{ position: 'absolute', top: '-24px', color: isFuture ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                  {ev.time}
                </div>
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: isCurrent ? 'var(--accent-yellow)' : isPast ? 'var(--accent-blue)' : 'var(--bg-panel)',
                  border: isCurrent ? '2px solid rgba(234, 179, 8, 0.4)' : isPast ? 'none' : '1px solid var(--border-color)',
                  boxShadow: isCurrent ? '0 0 10px rgba(234,179,8,0.8)' : 'none',
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
