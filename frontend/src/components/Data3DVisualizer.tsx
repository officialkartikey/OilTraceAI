import React from 'react';
import dynamic from 'next/dynamic';
import { useInvestigation } from '@/context/InvestigationContext';

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function Data3DVisualizer() {
  const { data } = useInvestigation();
  
  if (!data?.observation?.geospatial_bounds?.coordinates) return null;
  
  const coords = data.observation.geospatial_bounds.coordinates[0]; // First ring
  
  const lons = coords.map((c: any) => c[0]);
  const lats = coords.map((c: any) => c[1]);
  const z = coords.map(() => 0); // Flat on sea surface
  
  return (
    <div className="tactical-panel" style={{ padding: '16px', flex: 1, pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        3D Spatial Bounds
      </h3>
      <div style={{ flex: 1, minHeight: '300px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <Plot
          data={[
            {
              type: 'scatter3d',
              mode: 'lines+markers',
              x: lons,
              y: lats,
              z: z,
              surfaceaxis: 2, // Fill underneath
              surfacecolor: 'rgba(14, 165, 233, 0.2)',
              marker: { color: 'rgb(14, 165, 233)', size: 4 },
              line: { color: 'rgb(14, 165, 233)', width: 4 },
              name: 'Observation Area'
            }
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            margin: { l: 0, r: 0, t: 0, b: 0 },
            scene: {
              xaxis: { title: 'Longitude', color: '#888', gridcolor: '#333' },
              yaxis: { title: 'Latitude', color: '#888', gridcolor: '#333' },
              zaxis: { title: 'Elevation', color: '#888', gridcolor: '#333', range: [-5, 5] },
              camera: { eye: { x: 1.5, y: -1.5, z: 0.8 } }
            },
            autosize: true
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );
}
