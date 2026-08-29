import { Wind, Navigation, Waves } from 'lucide-react';

export default function EnvironmentalConditions() {
  return (
    <div className="tactical-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Environmental Conditions
        </h3>
        <a href="#" style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>View Details</a>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        
        {/* Wind */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Wind</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wind size={16} color="var(--accent-blue)" />
            <div className="tactical-text">
              <span style={{ fontSize: '16px', color: 'var(--text-primary)' }}>12.4</span> m/s
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>NE</div>
            </div>
          </div>
        </div>

        {/* Current */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Current</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={16} color="var(--accent-blue)" style={{ transform: 'rotate(45deg)' }} />
            <div className="tactical-text">
              <span style={{ fontSize: '16px', color: 'var(--text-primary)' }}>0.8</span> m/s
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ESE</div>
            </div>
          </div>
        </div>

        {/* Wave Height */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Wave Height</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Waves size={16} color="var(--accent-blue)" />
            <div className="tactical-text">
              <span style={{ fontSize: '16px', color: 'var(--text-primary)' }}>1.2</span> m
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
