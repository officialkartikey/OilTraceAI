"use client";
import React from 'react';
import Header from '@/components/Header';
import { User, Shield, Cpu, Sliders } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>System Settings</h1>
        
        <div style={{ display: 'flex', gap: '32px', flex: 1 }}>
          
          {/* Settings Nav */}
          <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="tactical-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(14, 165, 233, 0.1)', borderLeft: '3px solid var(--accent-blue)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <User size={16} /> Profile & Access
            </div>
            <div className="tactical-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', borderLeft: '3px solid transparent', cursor: 'pointer' }}>
              <Sliders size={16} /> Detection Thresholds
            </div>
            <div className="tactical-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', borderLeft: '3px solid transparent', cursor: 'pointer' }}>
              <Cpu size={16} /> Model Config
            </div>
            <div className="tactical-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', borderLeft: '3px solid transparent', cursor: 'pointer' }}>
              <Shield size={16} /> Security Audit
            </div>
          </div>

          {/* Settings Content */}
          <div className="tactical-panel" style={{ flex: 1, padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>Profile & Access</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: 'var(--border-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600 }}>NA</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>NTRO Analyst</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Administrator • Clearance Level 5</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>API Key</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input type="password" value="************************" readOnly style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px', outline: 'none' }} />
                  <button style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>Rotate Key</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Notification Preferences</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent-blue)' }} /> Critical Alerts (Push & Email)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent-blue)' }} /> New SAR Imagery Available
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--accent-blue)' }} /> Weekly System Summary
                  </label>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
