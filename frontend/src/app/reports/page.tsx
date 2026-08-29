"use client";
import React from 'react';
import Header from '@/components/Header';
import { FileText, Download, Share2, Plus } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    { id: 'REP-20260824-01', title: 'Attribution Package: Oceanic Pride', date: '24 Aug 2026', author: 'NTRO Analyst', status: 'Final' },
    { id: 'REP-20260823-04', title: 'Weekly Environmental Impact Summary', date: '23 Aug 2026', author: 'System Auto-Gen', status: 'Draft' },
    { id: 'REP-20260820-02', title: 'SAR Anomaly Detection Log', date: '20 Aug 2026', author: 'System Auto-Gen', status: 'Final' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>Reports & Intelligence</h1>
          <button style={{ padding: '8px 16px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Create Report
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {reports.map(report => (
            <div key={report.id} className="tactical-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <FileText size={20} color="var(--accent-blue)" />
                </div>
                <span style={{ 
                  fontSize: '10px', padding: '4px 8px', borderRadius: '4px',
                  background: report.status === 'Final' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  color: report.status === 'Final' ? 'var(--accent-green)' : 'var(--accent-yellow)'
                }}>
                  {report.status}
                </span>
              </div>
              
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                {report.title}
              </h3>
              
              <div className="tactical-text" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                ID: {report.id}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{report.author}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{report.date}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Share2 size={16} /></button>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Download size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
