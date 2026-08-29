"use client";
import React, { useState, useRef } from 'react';
import Header from '@/components/Header';
import { Upload, Image as ImageIcon, Crosshair, Filter, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ObservationsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const observations = [
    { id: 'OBS-101', type: 'SAR (Sentinel-1)', date: '24 Aug 2026 10:30', location: '19.1°N 72.9°E', thumb: 'rad1' },
    { id: 'OBS-100', type: 'Optical (Sentinel-2)', date: '24 Aug 2026 06:15', location: '19.1°N 72.9°E', thumb: 'opt1' },
    { id: 'OBS-099', type: 'SAR (Sentinel-1)', date: '23 Aug 2026 22:10', location: '19.0°N 72.8°E', thumb: 'rad2' },
  ];

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      setUploading(true);
      setStatusMsg('Uploading to secure server...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok || !uploadData.fileId) {
        throw new Error(uploadData.message || 'Upload failed');
      }

      setUploading(false);
      setDetecting(true);
      setStatusMsg('Running AI detection & attribution...');

      const detectRes = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          spill_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
          spill_lat: 19.05,
          spill_lon: 72.85
        })
      });

      const detectData = await detectRes.json();
      
      if (!detectRes.ok) {
        throw new Error(detectData.message || 'Detection failed');
      }

      setDetecting(false);
      setStatusMsg('Analysis complete!');
      
      // Navigate to dashboard to see new alert
      setTimeout(() => router.push('/'), 1500);

    } catch (err: any) {
      console.error(err);
      setStatusMsg('Error: ' + err.message);
      setUploading(false);
      setDetecting(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>Observations</h1>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="tactical-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Calendar size={16} /> Last 7 Days
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
          
          {/* Main Gallery */}
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', overflowY: 'auto' }}>
              {observations.map((obs) => (
                <div key={obs.id} className="tactical-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '10px 10px', opacity: 0.5 }}></div>
                    {obs.type.includes('SAR') && (
                      <div style={{ position: 'absolute', inset: '10%', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '20% 40% 30% 50%', boxShadow: '0 0 10px rgba(239,68,68,0.2) inset' }}></div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="tactical-text" style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{obs.id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{obs.type}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Sidebar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="tactical-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Ingest New Observation</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Upload SAR imagery for analysis.</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileChange} 
                style={{ display: 'none' }} 
                accept="image/*"
              />

              <div 
                style={{ 
                  flex: 1, 
                  border: `2px dashed ${dragActive ? 'var(--accent-blue)' : 'var(--border-color)'}`, 
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: dragActive ? 'rgba(14, 165, 233, 0.05)' : 'rgba(0,0,0,0.2)',
                  transition: 'all 0.2s',
                  cursor: (uploading || detecting) ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !(uploading || detecting) && fileInputRef.current?.click()}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {(uploading || detecting) ? (
                  <>
                    <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ marginBottom: '16px' }} />
                    <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: 600 }}>{statusMsg}</div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Upload size={24} color={dragActive ? 'var(--accent-blue)' : 'var(--text-secondary)'} />
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
                      Drag & drop files here
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Supported formats: JPG, PNG, TIF
                    </div>
                    <button style={{ 
                      marginTop: '24px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                    }}>
                      Browse Files
                    </button>
                    {statusMsg && <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--accent-red)' }}>{statusMsg}</div>}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
