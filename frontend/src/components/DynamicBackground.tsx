"use client";
import React, { useEffect, useRef } from 'react';

export default function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Stars / Satellites
    const stars: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number; blinkSpeed: number }[] = [];
    const numStars = 150;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        opacity: Math.random(),
        blinkSpeed: Math.random() * 0.01 + 0.002,
      });
    }

    const satellites: { x: number; y: number; size: number; speedX: number; speedY: number; color: string }[] = [];
    const numSatellites = 5;
    const colors = ['#0ea5e9', '#10b981', '#ffffff'];

    for (let i = 0; i < numSatellites; i++) {
      satellites.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 1,
        speedX: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.3 + 0.2),
        speedY: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.3 + 0.2),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle animated gradient orbs
      const time = Date.now() * 0.0005;
      const x1 = width * 0.15 + Math.sin(time) * 50;
      const y1 = height * 0.5 + Math.cos(time) * 50;
      
      const x2 = width * 0.85 + Math.sin(time + Math.PI) * 50;
      const y2 = height * 0.3 + Math.cos(time + Math.PI) * 50;

      const gradient = ctx.createRadialGradient(x1, y1, 0, x1, y1, width * 0.4);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.08)');
      gradient.addColorStop(1, 'transparent');
      
      const gradient2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, width * 0.4);
      gradient2.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
      gradient2.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      // Draw stars
      stars.forEach(star => {
        star.x += star.speedX;
        star.y += star.speedY;

        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        star.opacity += star.blinkSpeed;
        if (star.opacity > 1 || star.opacity < 0.1) {
          star.blinkSpeed = -star.blinkSpeed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, star.opacity))})`;
        ctx.fill();
      });

      // Draw satellites
      satellites.forEach(sat => {
        sat.x += sat.speedX;
        sat.y += sat.speedY;

        if (sat.x < 0) sat.x = width;
        if (sat.x > width) sat.x = 0;
        if (sat.y < 0) sat.y = height;
        if (sat.y > height) sat.y = 0;

        ctx.beginPath();
        ctx.arc(sat.x, sat.y, sat.size, 0, Math.PI * 2);
        ctx.fillStyle = sat.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = sat.color;
        ctx.fill();
        ctx.shadowBlur = 0; 
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
