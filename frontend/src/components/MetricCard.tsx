import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  color: string;
}

export default function MetricCard({ title, value, trend, trendUp, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="glass animate-fade-in" style={{ padding: '24px', flex: 1, minWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500 }}>{title}</div>
        <div style={{
          background: `rgba(${color}, 0.1)`,
          padding: '8px',
          borderRadius: '8px',
          color: `rgb(${color})`
        }}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <span style={{ 
          color: trendUp ? 'var(--accent)' : 'var(--danger)',
          background: trendUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 600
        }}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>vs last week</span>
      </div>
    </div>
  );
}
