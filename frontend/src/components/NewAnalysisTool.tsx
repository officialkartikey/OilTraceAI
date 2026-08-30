import React, { useState, useRef } from 'react';
import { UploadCloud, MapPin, Calendar, Play, Loader2, FileImage, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { investigationsApi } from '@/lib/api/investigations';

export default function NewAnalysisTool() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload an image first.");
      return;
    }
    
    let lat: number | undefined;
    let lon: number | undefined;
    
    if (locationInput) {
      const parts = locationInput.split(',');
      if (parts.length === 2) {
        lat = parseFloat(parts[0].trim());
        lon = parseFloat(parts[1].trim());
      }
    }

    setIsSubmitting(true);
    
    try {
      // Step 1: Upload the image
      const uploadRes = await investigationsApi.uploadAnalysisImage(file);
      const fileId = uploadRes.fileId;
      
      // Step 2: Run ML Detection
      const detectRes = await investigationsApi.runDetection({
        fileId,
        spill_time: timeInput ? new Date(timeInput).toISOString() : undefined,
        spill_lat: lat,
        spill_lon: lon
      });
      
      if (detectRes.success && detectRes.incidentId) {
        setSuccess(true);
        // Step 3: Redirect to new investigation workspace
        setTimeout(() => {
          router.push(`/investigations/${detectRes.incidentId}`);
        }, 1000);
      } else {
        throw new Error("Detection failed to return an incident ID");
      }
      
    } catch (error: any) {
      console.error("Analysis Error:", error);
      alert("Failed to initialize analysis: " + error.message);
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="tactical-panel" style={{ padding: '24px', pointerEvents: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <UploadCloud size={18} color="var(--accent-blue)" />
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>New Data Ingestion</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Image Upload Area */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept=".tiff,.tif,.zip,.safe,.png,.jpg,.jpeg"
        />
        
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{ 
              border: '1px dashed var(--border-color)', 
              borderRadius: '6px', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <UploadCloud size={24} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>Drag & Drop or Click to Upload Image</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Supported formats: .PNG, .JPEG, .TIFF, .SAFE, .ZIP</div>
          </div>
        ) : (
          <div style={{ 
            border: '1px solid var(--accent-blue)', 
            borderRadius: '6px', 
            padding: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: 'rgba(14, 165, 233, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileImage size={24} color="var(--accent-blue)" />
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{file.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setFile(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Location & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location (Lat, Lon)</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px' }}>
              <MapPin size={14} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="e.g. 18.85, 72.75" 
                required 
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px', width: '100%', outline: 'none' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date & Time (UTC)</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px' }}>
              <Calendar size={14} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
              <input 
                type="datetime-local" 
                required 
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px', width: '100%', outline: 'none' }} 
              />
            </div>
          </div>

        </div>

        {/* Source Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Satellite Source</label>
          <select style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
            <option value="sentinel-1">Sentinel-1 (Copernicus)</option>
            <option value="radarsat-2">RADARSAT-2</option>
            <option value="terrasar-x">TerraSAR-X</option>
            <option value="capella">Capella Space</option>
          </select>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={isSubmitting || !file}
          style={{ 
            marginTop: '8px', padding: '12px', 
            background: success ? 'var(--accent-green)' : (file && !isSubmitting) ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', 
            color: (file && !isSubmitting) || success ? '#fff' : 'var(--text-secondary)', 
            border: 'none', borderRadius: '4px',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', 
            cursor: isSubmitting || !file ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: 600,
            transition: 'all 0.3s'
          }}
        >
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" /> Transmitting to Backend...</>
          ) : success ? (
            <>Analysis Initialized Successfully!</>
          ) : (
            <><Play size={16} fill="currentColor" /> Run Kairos Analysis</>
          )}
        </button>

      </form>
    </div>
  );
}
