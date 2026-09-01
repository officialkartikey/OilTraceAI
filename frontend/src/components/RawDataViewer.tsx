import React, { useState } from 'react';
import { Database, ChevronDown, ChevronRight } from 'lucide-react';
import { useInvestigation } from '@/context/InvestigationContext';

export default function RawDataViewer() {
  const { data } = useInvestigation();
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  return (
    <div className="tactical-panel" style={{ padding: '16px', pointerEvents: 'auto' }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Raw Telemetry Data
          </h3>
        </div>
        {expanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ 
          marginTop: '16px', 
          background: 'rgba(0,0,0,0.5)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '4px', 
          padding: '12px',
          maxHeight: '400px',
          overflowY: 'auto'
        }} className="custom-scrollbar">
          <pre style={{ 
            fontSize: '11px', 
            color: 'var(--accent-green)', 
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
