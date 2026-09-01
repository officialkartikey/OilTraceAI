"use client";
import React from 'react';
import { useInvestigation } from '@/context/InvestigationContext';
import { Wind, Navigation, Thermometer, Waves } from 'lucide-react';

export default function EnvironmentalConditions() {
  const { data, loading } = useInvestigation();
  
  if (loading) {
    return <div className="tactical-panel" style={{ padding: '24px', opacity: 0.5 }}>Loading Environment...</div>;
  }

  const env = data?.environment;
  const wind_speed = env?.wind_speed_kn ?? 0;
  const wind_dir = env?.wind_dir_deg ?? 0; // Wait, env doesn't have dir in new API schema? Actually the engine uses current_dir_deg, wind_dir_deg but they weren't exposed in get_full. Wait, drift_engine does!

  return (
    <div className="tactical-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Thermometer size={16} color="var(--accent-blue)" />
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Environmental Context
        </h3>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Wind */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Wind size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wind</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="tactical-text" style={{ fontSize: '18px' }}>{wind_speed.toFixed(1)}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>kn</span>
          </div>
        </div>

        {/* Current */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Waves size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="tactical-text" style={{ fontSize: '18px' }}>{(env?.current_speed_kn ?? 0).toFixed(1)}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>kn</span>
          </div>
        </div>

      </div>
    </div>
  );
}
