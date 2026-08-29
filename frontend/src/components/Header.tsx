import { useState, useEffect } from 'react';
import { Search, Bell, Maximize, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
  backLink?: string;
}

export default function Header({ title = 'ARGUS', backLink }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
      background: 'linear-gradient(180deg, rgba(5, 10, 20, 0.9) 0%, rgba(5, 10, 20, 0.4) 100%)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(14, 165, 233, 0.2)',
      boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'auto'
    }}>
      
      {/* HUD Accents */}
      <div style={{ position: 'absolute', bottom: -1, left: 0, width: '120px', height: '1px', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }}></div>
      <div style={{ position: 'absolute', bottom: -1, right: 0, width: '120px', height: '1px', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }}></div>

      {/* Left side: Title and Back Link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {backLink && (
          <Link href={backLink} style={{ 
            color: 'var(--text-secondary)', 
            transition: 'all 0.2s', 
            display: 'flex', 
            alignItems: 'center',
            padding: '8px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft size={18} />
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '4px', height: '24px', 
            background: 'var(--accent-blue)', 
            borderRadius: '2px',
            boxShadow: '0 0 8px var(--accent-blue)'
          }}></div>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Active Session</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', letterSpacing: '0.5px' }}>{title.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Middle: Optional Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 6px var(--accent-green)' }}></div>
        <span style={{ fontSize: '10px', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Secure Uplink</span>
      </div>

      {/* Right side: Time and Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        
        {/* Date Time display */}
        <div className="tactical-text" style={{ 
          display: 'flex', gap: '16px', color: 'var(--text-primary)', 
          background: 'rgba(0,0,0,0.4)', padding: '6px 16px', borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {mounted && now ? (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>{now.toISOString().substring(0, 10)}</span>
              <span style={{ color: '#fff', fontWeight: 500, letterSpacing: '1px' }}>{now.toISOString().substring(11, 19)} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>UTC</span></span>
            </>
          ) : (
            <span style={{ opacity: 0 }}>Loading...</span>
          )}
        </div>

        {/* Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setSearchFocused(!searchFocused)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', padding: '6px', borderRadius: '4px' }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Search size={18} />
            </button>
            {searchFocused && (
              <div className="tactical-panel animate-fade-in" style={{ position: 'absolute', right: 0, top: '48px', width: '300px', padding: '12px' }}>
                <input autoFocus type="text" placeholder="Search MMSI, Call Sign, Area..." style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '4px', outline: 'none', fontFamily: 'inherit', fontSize: '12px' }} />
              </div>
            )}
          </div>

          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', display: 'flex', padding: '6px', borderRadius: '4px' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'var(--accent-red)',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              boxShadow: '0 0 6px var(--accent-red)'
            }}></span>
          </button>
          
          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', padding: '6px', borderRadius: '4px' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Maximize size={18} />
          </button>
        </div>
        
      </div>
    </header>
  );
}
