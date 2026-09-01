"use client";
import React from 'react';
import { useInvestigation } from '@/context/InvestigationContext';
import { Activity, Clock } from 'lucide-react';

export default function IncidentTimeline() {
  const { timeline, data } = useInvestigation();
  
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="tactical-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Activity size={16} color="var(--accent-blue)" />
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Incident Timeline
        </h3>
      </div>
      
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {timeline.map((item, i) => {
            const isLast = i === timeline.length - 1;
            const t = new Date(item.timestamp);
            const timeStr = isNaN(t.getTime()) ? item.timestamp : `${t.toISOString().substring(11, 19)} UTC`;
            
            return (
              <div key={i} style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0, marginTop: '4px', boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)' }}></div>
                  {!isLast && <div style={{ width: '2px', flex: 1, background: 'rgba(14, 165, 233, 0.2)', margin: '4px 0' }}></div>}
                </div>
                <div style={{ paddingBottom: isLast ? '0' : '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} /> {timeStr}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.event}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
