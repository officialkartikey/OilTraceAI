import { useState, useEffect } from 'react';
import { Bell, Maximize, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface HeaderProps {
  title?: string;
  backLink?: string;
}

export default function Header({ title = 'Kairos', backLink }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleFullscreen = () => {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <header style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
      background: 'var(--header-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--header-border)',
      boxShadow: 'var(--shadow-tactical)',
      pointerEvents: 'auto'
    }}>
      
      {/* HUD Accents */}
      <div style={{ position: 'absolute', bottom: -1, left: 0, width: '120px', height: '1px', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }}></div>
      <div style={{ position: 'absolute', bottom: -1, right: 0, width: '120px', height: '1px', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }}></div>

      {/* Left side: Title and Back Link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {backLink && (
          <Link href={backLink} style={{ 
            color: 'var(--text-secondary)', 
            transition: 'all 0.2s ease', 
            display: 'flex', 
            alignItems: 'center',
            padding: '8px',
            background: 'var(--button-ghost-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-highlight)' }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}>
            <ArrowLeft size={16} />
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '4px', height: '26px', 
            background: 'var(--accent-blue)', 
            borderRadius: '2px',
            boxShadow: '0 0 8px var(--accent-blue)'
          }}></div>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '1.2px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Active Session</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.6px' }}>{title.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Middle: Live Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.1)', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 6px var(--accent-green)' }}></div>
        <span style={{ fontSize: '10px', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Secure Uplink Active</span>
      </div>

      {/* Right side: Time and Action Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* Date Time display */}
        <div className="tactical-text" style={{ 
          display: 'flex', gap: '14px', color: 'var(--text-primary)', 
          background: 'var(--input-bg)', padding: '6px 14px', borderRadius: '6px',
          border: '1px solid var(--border-color)',
          fontSize: '11px'
        }}>
          {mounted && now ? (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>{now.toISOString().substring(0, 10)}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.8px' }}>
                {now.toISOString().substring(11, 19)} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>UTC</span>
              </span>
            </>
          ) : (
            <span style={{ opacity: 0 }}>Loading...</span>
          )}
        </div>

        {/* Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          {/* Theme Toggle - Replaced Search button */}
          <ThemeToggle size={16} />

          {/* Alerts Notification Button */}
          <Link href="/alerts" style={{ textDecoration: 'none' }}>
            <button 
              title="System Alerts"
              style={{ 
                background: 'transparent', 
                border: '1px solid var(--border-color)', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer', 
                position: 'relative', 
                transition: 'all 0.2s ease', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px', 
                borderRadius: '6px',
                width: '34px',
                height: '34px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--button-ghost-hover)'; e.currentTarget.style.borderColor = 'var(--border-highlight)' }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
            >
              <Bell size={16} />
              <span style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                background: 'var(--accent-red)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                boxShadow: '0 0 6px var(--accent-red)'
              }}></span>
            </button>
          </Link>
          
          {/* Maximize / Fullscreen Button */}
          <button 
            title="Toggle Fullscreen"
            onClick={handleToggleFullscreen}
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px', 
              borderRadius: '6px',
              width: '34px',
              height: '34px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--button-ghost-hover)'; e.currentTarget.style.borderColor = 'var(--border-highlight)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
          >
            <Maximize size={16} />
          </button>
        </div>
        
      </div>
    </header>
  );
}
