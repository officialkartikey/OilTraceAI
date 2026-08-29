import { useState } from 'react';
import { Search, Bell, Maximize, ChevronDown, Check } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { activeInvestigation, setActiveInvestigation } = useDashboard();
  const [searchFocused, setSearchFocused] = useState(false);

  const investigations = [
    'IN-2026-08-24-1030',
    'IN-2026-08-23-0915',
    'IN-2026-08-20-1422'
  ];

  return (
    <header style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 1000,
      pointerEvents: 'none'
    }}>
      
      {/* Left side: Investigation Dropdown */}
      <div style={{ pointerEvents: 'auto', position: 'relative' }}>
        <div 
          className="tactical-panel" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{ 
            display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '16px', cursor: 'pointer',
            background: dropdownOpen ? 'var(--bg-panel-hover)' : 'var(--bg-panel)',
            transition: 'background 0.2s'
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Investigation</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeInvestigation}</div>
          </div>
          <ChevronDown size={16} color="var(--text-muted)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="tactical-panel animate-fade-in" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {investigations.map(inv => (
              <div 
                key={inv}
                onClick={() => {
                  setActiveInvestigation(inv);
                  setDropdownOpen(false);
                }}
                style={{ 
                  padding: '12px 16px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: activeInvestigation === inv ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => {
                  if (activeInvestigation !== inv) e.currentTarget.style.background = 'transparent';
                  else e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)';
                }}
              >
                <span style={{ fontSize: '12px', color: activeInvestigation === inv ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                  {inv}
                </span>
                {activeInvestigation === inv && <Check size={14} color="var(--accent-blue)" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right side: Time and Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px', pointerEvents: 'auto' }}>
        
        {/* Date Time display */}
        <div className="tactical-text" style={{ display: 'flex', gap: '12px', color: 'var(--text-primary)' }}>
          <span>24 Aug 2026</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span>10:30:00 UTC</span>
        </div>

        {/* Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setSearchFocused(!searchFocused)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <Search size={20} />
            </button>
            {searchFocused && (
              <div className="tactical-panel animate-fade-in" style={{ position: 'absolute', right: 0, top: '40px', width: '300px', padding: '12px' }}>
                <input autoFocus type="text" placeholder="Search MMSI, Call Sign, Area..." style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '4px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            )}
          </div>

          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Bell size={20} />
            <span style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: 'var(--accent-red)',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
            }}></span>
          </button>
          
          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Maximize size={20} />
          </button>
        </div>
        
      </div>
    </header>
  );
}
