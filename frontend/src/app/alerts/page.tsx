"use client";
import React from 'react';
import Header from '@/components/Header';
import { AlertTriangle, Info, Bell, CheckCircle2 } from 'lucide-react';

export default function AlertsPage() {
  const alerts = [
    { id: 1, type: 'CRITICAL', title: 'AIS Spoofing Detected', message: 'Vessel "Oceanic Pride" exhibiting impossible speed patterns indicating potential AIS spoofing.', time: '10 mins ago', read: false },
    { id: 2, type: 'HIGH', title: 'New Slick Observation', message: 'High confidence SAR detection in Arabian Sea sector 4.', time: '1 hour ago', read: false },
    { id: 3, type: 'INFO', title: 'Reconstruction Complete', message: 'Hindcast simulation for investigation IN-2026-08-24-1030 is ready for review.', time: '3 hours ago', read: true },
    { id: 4, type: 'WARNING', title: 'System Load High', message: 'Cluster processing latency exceeding threshold.', time: '5 hours ago', read: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bell size={24} /> System Alerts
          </h1>
          <button 
            style={{ 
              padding: '8px 16px', 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              e.currentTarget.style.color = 'var(--accent-cyan)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            Mark All as Read
          </button>
        </div>

        <div className="tactical-panel" style={{ flex: 1, overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          {alerts.map(alert => {
            const isCritical = alert.type === 'CRITICAL';
            const isHigh = alert.type === 'HIGH';
            const isWarning = alert.type === 'WARNING';
            
            const Icon = isCritical ? AlertTriangle : isHigh ? AlertTriangle : isWarning ? AlertTriangle : Info;
            const color = isCritical ? 'var(--accent-red)' : isHigh ? 'var(--accent-orange)' : isWarning ? 'var(--accent-yellow)' : 'var(--accent-blue)';
            const bgColor = isCritical ? 'rgba(239, 68, 68, 0.1)' : isHigh ? 'rgba(249, 115, 22, 0.1)' : isWarning ? 'rgba(234, 179, 8, 0.1)' : 'rgba(14, 165, 233, 0.1)';

            return (
              <div key={alert.id} style={{ 
                padding: '24px', borderBottom: '1px solid var(--border-color)',
                display: 'flex', gap: '16px', opacity: alert.read ? 0.6 : 1,
                background: alert.read ? 'transparent' : 'var(--table-row-alt)',
                transition: 'background 0.2s'
              }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '8px', 
                  background: bgColor, border: `1px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={20} color={color} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: color, textTransform: 'uppercase' }}>{alert.type}</span>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{alert.title}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{alert.time}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {alert.message}
                  </p>
                </div>

                <div style={{ alignSelf: 'center' }}>
                  {!alert.read && (
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <CheckCircle2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
