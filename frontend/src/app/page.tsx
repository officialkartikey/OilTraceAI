"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import { Shield, Activity, Clock, MapPin } from 'lucide-react';
import { investigationsApi } from '@/lib/api/investigations';
import { Alert } from '@/lib/api/types';
import Link from 'next/link';
import NewAnalysisTool from '@/components/NewAnalysisTool';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapWidget = dynamic(() => import('@/components/MapWidget'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', background: 'var(--bg-base)' }}></div>
});

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  useEffect(() => {
    investigationsApi.getAlertsData().then(setAlerts).catch(console.error);
  }, []);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
      
      {/* Background Map Layer (Z-Index 0) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapWidget 
          activeAlert={alerts.length > 0 ? alerts[0] : null}
        />
      </div>

      {/* Scrollable UI Overlay Layer (Z-Index 10) */}
      <div className="custom-scrollbar" style={{ 
        position: 'absolute', inset: 0, zIndex: 10, 
        overflowY: 'auto', overflowX: 'hidden',
        pointerEvents: 'none', 
        display: 'flex', flexDirection: 'column' 
      }}>
        
        {/* Sticky Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, pointerEvents: 'auto' }}>
          <Header title="Operational Overview" />
        </div>

        {/* Content Wrapper */}
        <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', 
          padding: '80px 32px 32px 32px', gap: '32px',
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}></div>
            
            {/* Right side: Data Ingestion & Recent Alerts */}
            <div style={{ width: '400px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Data Ingestion Tool */}
              <NewAnalysisTool />

              {/* Recent Alerts */}
              <div className="tactical-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Activity size={18} color="var(--accent-blue)" />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Recent System Alerts</h2>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }} className="custom-scrollbar">
                  {alerts.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No recent alerts.</div>
                  ) : (
                    alerts.map(alert => (
                      <Link href={`/investigations/${alert._id}`} key={alert._id} style={{ textDecoration: 'none' }}>
                        <div style={{ 
                          padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', 
                          borderRadius: '6px', cursor: 'pointer', transition: 'border-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Shield size={12} /> New Detection
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(alert.timestamp).toISOString().substring(11, 16)} UTC
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{alert.observation_id}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <MapPin size={12} /> Sentinel-1 SAR Overpass
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
