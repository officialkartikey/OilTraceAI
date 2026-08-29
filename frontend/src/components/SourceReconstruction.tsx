"use client";
import React, { useEffect, useRef } from 'react';

export default function SourceReconstruction() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI Canvas setup
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual size in memory (scaled to account for extra padding during rotation)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Simulation parameters
    const particles: any[] = [];
    const originX = width * 0.6;
    const originY = height * 0.4;
    const windVx = -0.6; // Drift left
    const windVy = 0.3;  // Drift down
    const diffusion = 0.5; // Random scatter amount

    let animationFrameId: number;

    const spawnParticle = () => {
      // Add multiple particles per frame for denser heatmap
      for(let i=0; i<3; i++) {
        particles.push({
          x: originX + (Math.random() - 0.5) * 10,
          y: originY + (Math.random() - 0.5) * 10,
          vx: windVx + (Math.random() - 0.5) * diffusion,
          vy: windVy + (Math.random() - 0.5) * diffusion,
          life: 0,
          maxLife: 100 + Math.random() * 100
        });
      }
    };

    const render = () => {
      // Trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Dark slate background with opacity for trails
      ctx.fillRect(0, 0, width, height);

      spawnParticle();

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        
        // Add some noise to movement
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;
        
        p.x += p.vx;
        p.y += p.vy;

        // Color based on age (heatmap effect: Red -> Yellow -> Green -> Blue)
        const ageRatio = p.life / p.maxLife;
        let color = '';
        if (ageRatio < 0.2) color = 'rgba(239, 68, 68, 0.8)'; // Red
        else if (ageRatio < 0.5) color = 'rgba(234, 179, 8, 0.6)'; // Yellow
        else if (ageRatio < 0.8) color = 'rgba(34, 197, 94, 0.4)'; // Green
        else color = 'rgba(14, 165, 233, 0.2)'; // Blue

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + (ageRatio * 3), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Remove dead particles
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      // Draw origin marker (The Slick)
      ctx.beginPath();
      ctx.arc(originX, originY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="tactical-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Source Reconstruction
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-fast 1s infinite' }}></div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Simulating Hindcast</div>
        </div>
      </div>
      
      {/* 3D Simulation Container */}
      <div style={{ 
        position: 'relative', 
        height: '180px', 
        background: 'rgba(0,0,0,0.5)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* The tactical grid */}
        <div style={{
          position: 'absolute',
          width: '150%',
          height: '150%',
          backgroundSize: '20px 20px',
          backgroundImage: 'linear-gradient(to right, rgba(14, 165, 233, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(14, 165, 233, 0.1) 1px, transparent 1px)',
          transform: 'rotateX(60deg) rotateZ(-45deg)',
          transformOrigin: 'center',
          pointerEvents: 'none'
        }}></div>
        
        {/* Dynamic Canvas Simulation */}
        <canvas 
          ref={canvasRef} 
          style={{
            position: 'absolute',
            width: '150%', // Oversized to prevent clipping during rotation
            height: '150%',
            transform: 'rotateX(60deg) rotateZ(-45deg)', // Projects 2D sim into 3D space!
            transformOrigin: 'center',
            filter: 'blur(1px)' // Slight blur for liquid feel
          }}
        />

        {/* Legend */}
        <div style={{ position: 'absolute', right: '12px', bottom: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>Probability</div>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '2px' }}>High</div>
          <div style={{ 
            width: '12px', 
            height: '60px', 
            background: 'linear-gradient(to bottom, #ef4444, #eab308, #22c55e, #0ea5e9)',
            borderRadius: '2px'
          }}></div>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>Low</div>
        </div>
      </div>
    </div>
  );
}
