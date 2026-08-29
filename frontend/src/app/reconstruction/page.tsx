"use client";
import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { Play, Pause, FastForward, Rewind } from 'lucide-react';
import SourceReconstruction from '@/components/SourceReconstruction';

export default function ReconstructionPage() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;

    const originX = width * 0.7;
    const originY = height * 0.3;
    const windVx = -2.0; 
    const windVy = 1.0;  
    const diffusion = 1.5; 

    let animationFrameId: number;

    const spawnParticle = () => {
      for(let i=0; i<10; i++) {
        particlesRef.current.push({
          x: originX + (Math.random() - 0.5) * 20,
          y: originY + (Math.random() - 0.5) * 20,
          vx: windVx + (Math.random() - 0.5) * diffusion,
          vy: windVy + (Math.random() - 0.5) * diffusion,
          life: 0,
          maxLife: 200 + Math.random() * 200
        });
      }
    };

    const render = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)'; 
      ctx.fillRect(0, 0, width, height);

      if (isPlaying) {
        for (let s = 0; s < speedMultiplier; s++) {
          spawnParticle();
          
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.life++;
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
            p.x += p.vx;
            p.y += p.vy;

            if (p.life >= p.maxLife) {
              particlesRef.current.splice(i, 1);
            }
          }
        }
      }

      for (const p of particlesRef.current) {
        const ageRatio = p.life / p.maxLife;
        let color = '';
        if (ageRatio < 0.2) color = 'rgba(239, 68, 68, 0.8)';
        else if (ageRatio < 0.5) color = 'rgba(234, 179, 8, 0.6)';
        else if (ageRatio < 0.8) color = 'rgba(34, 197, 94, 0.4)';
        else color = 'rgba(14, 165, 233, 0.2)';

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + (ageRatio * 6), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(originX, originY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, speedMultiplier]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Header />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '80px 32px 32px 32px', gap: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '1px' }}>Source Forensics & Reconstruction</h1>
          
          <div className="tactical-panel" style={{ display: 'flex', gap: '16px', padding: '8px 16px', alignItems: 'center' }}>
            <button 
              onClick={() => { setSpeedMultiplier(1); setIsPlaying(true); }}
              style={{ background: 'none', border: 'none', color: speedMultiplier === 1 && isPlaying ? 'var(--accent-blue)' : 'var(--text-primary)', cursor: 'pointer' }}>
              <Rewind size={18} />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              onClick={() => { setSpeedMultiplier(3); setIsPlaying(true); }}
              style={{ background: 'none', border: 'none', color: speedMultiplier === 3 ? 'var(--accent-blue)' : 'var(--text-primary)', cursor: 'pointer' }}>
              <FastForward size={18} />
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>{speedMultiplier}x Speed</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
          
          {/* Main Visualization Area */}
          <div className="tactical-panel" style={{ flex: 3, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             
             {/* 3D Grid Plane */}
             <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(14, 165, 233, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(14, 165, 233, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'perspective(800px) rotateX(60deg)', transformOrigin: 'top', pointerEvents: 'none' }}></div>
             
             {/* Canvas Particle Simulation */}
             <canvas 
               ref={canvasRef}
               style={{
                 position: 'absolute',
                 width: '150%',
                 height: '150%',
                 transform: 'perspective(800px) rotateX(60deg)',
                 transformOrigin: 'top',
                 filter: 'blur(2px)'
               }}
             />

             {/* Overlays */}
             <div style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 20 }}>
               <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Simulation Time</div>
               <div className="tactical-text" style={{ fontSize: '24px', color: isPlaying ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                 T - 04:32:00 {isPlaying ? '(Running)' : '(Paused)'}
               </div>
             </div>
          </div>

          {/* Controls & Metrics */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SourceReconstruction />
            
            <div className="tactical-panel" style={{ padding: '16px', flex: 1 }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '16px' }}>Simulation Parameters</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Wind Drift Factor</span><span>3.5%</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--bg-base)', borderRadius: '2px' }}>
                    <div style={{ width: '35%', height: '100%', background: 'var(--accent-blue)', borderRadius: '2px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Diffusion Coefficient</span><span>1.2 m²/s</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--bg-base)', borderRadius: '2px' }}>
                    <div style={{ width: '60%', height: '100%', background: 'var(--accent-blue)', borderRadius: '2px' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Oil Type</span><span>Heavy Crude (API 20)</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { particlesRef.current = []; setIsPlaying(true); }}
                style={{ width: '100%', padding: '10px', marginTop: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                Recalculate Trajectory
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
