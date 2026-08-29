"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useInvestigation } from '@/context/InvestigationContext';
import { Maximize2, Crosshair } from 'lucide-react';

export default function SourceReconstruction() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data } = useInvestigation();
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crisp high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Simulation params
    const env = data?.reconstruction?.environmentalInputs;
    const windRad = (env?.windDirDeg || 220) * Math.PI / 180;
    
    // Core origin (Slick Source) - centered
    const originX = width / 2;
    const originY = height / 2;

    let frame = 0;
    let animationId: number;

    const render = () => {
      frame++;
      
      // Clear background
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle tactical grid
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Draw Probability Contours (Heatmap)
      // We'll draw 4 concentric blob-like shapes representing probability zones
      // Outer (Low Prob - Blue)
      ctx.beginPath();
      ctx.ellipse(originX - 10, originY + 15, 120, 80, windRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.fill();

      // Mid-Low (Green)
      ctx.beginPath();
      ctx.ellipse(originX - 5, originY + 8, 80, 50, windRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fill();

      // Mid-High (Yellow)
      ctx.beginPath();
      ctx.ellipse(originX - 2, originY + 3, 40, 25, windRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.fill();

      // High (Red Source)
      ctx.beginPath();
      ctx.ellipse(originX, originY, 15, 10, windRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.fill();

      // 3. Draw Crosshairs at Origin
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(originX - 15, originY); ctx.lineTo(originX + 15, originY);
      ctx.moveTo(originX, originY - 15); ctx.lineTo(originX, originY + 15);
      ctx.stroke();
      
      // Center dot
      ctx.beginPath();
      ctx.arc(originX, originY, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // 4. Draw Radar Sweep (if simulating)
      if (isSimulating) {
        const sweepAngle = (frame * 0.02) % (Math.PI * 2);
        const sweepLength = 150;
        
        ctx.save();
        ctx.translate(originX, originY);
        ctx.rotate(sweepAngle);
        
        // Sweep gradient
        const grad = ctx.createLinearGradient(0, 0, 0, sweepLength);
        grad.addColorStop(0, 'rgba(14, 165, 233, 0)');
        grad.addColorStop(1, 'rgba(14, 165, 233, 0.3)');
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, sweepLength, 0, 0.4);
        ctx.lineTo(0, 0);
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Leading edge line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(0.4)*sweepLength, Math.sin(0.4)*sweepLength);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.restore();
      }

      // 5. Vector arrows (showing drift direction)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      const arrowLength = 30;
      const startX = originX - Math.cos(windRad) * 60;
      const startY = originY - Math.sin(windRad) * 60;
      const endX = startX - Math.cos(windRad) * arrowLength;
      const endY = startY - Math.sin(windRad) * arrowLength;
      
      // Arrow line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX + Math.cos(windRad - 0.5) * 8, endY + Math.sin(windRad - 0.5) * 8);
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX + Math.cos(windRad + 0.5) * 8, endY + Math.sin(windRad + 0.5) * 8);
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [data, isSimulating]);

  return (
    <div className="tactical-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '16px 20px', borderBottom: '1px solid rgba(14, 165, 233, 0.1)',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crosshair size={16} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Source Reconstruction
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSimulating ? 'var(--accent-green)' : 'var(--text-muted)', animation: isSimulating ? 'pulse-fast 1.5s infinite' : 'none' }}></div>
            <div style={{ fontSize: '9px', color: isSimulating ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isSimulating ? 'Hindcast Active' : 'Paused'}
            </div>
          </div>
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      
      {/* 2D Simulation Container */}
      <div style={{ position: 'relative', height: '220px', background: '#030712' }}>
        
        {/* HUD Overlay Top Left */}
        <div style={{ position: 'absolute', top: '12px', left: '16px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.5px' }}>PROBABILITY MAP</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>RES: 10m/px • T-12H</div>
        </div>

        {/* Dynamic Canvas Simulation */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <canvas 
            ref={canvasRef} 
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        {/* Legend Bottom Right */}
        <div style={{ 
          position: 'absolute', right: '16px', bottom: '16px', 
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', 
          zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '8px 12px', borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Origin Probability</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>0%</span>
            <div style={{ 
              width: '80px', height: '4px', 
              background: 'linear-gradient(to right, #0ea5e9, #22c55e, #eab308, #ef4444)',
              borderRadius: '2px'
            }}></div>
            <span style={{ fontSize: '9px', color: 'var(--text-primary)', fontWeight: 600 }}>100%</span>
          </div>
        </div>

      </div>
    </div>
  );
}
