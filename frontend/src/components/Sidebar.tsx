"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Eye, 
  Ship, 
  Crosshair, 
  Activity, 
  Settings, 
  HelpCircle, 
  Server, 
  PanelLeftClose, 
  PanelLeftOpen,
  Radar
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const topNavItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Observations', path: '/observations', icon: Eye },
    { name: 'Vessels', path: '/vessels', icon: Ship },
    { name: 'Investigations', path: '/investigations', icon: Crosshair },
    { name: 'Intelligence', path: '/intelligence', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const bottomNavItems = [
    { name: 'System', path: '/status', icon: Server },
    { name: 'Help', path: '/help', icon: HelpCircle },
  ];

  const NavGroup = ({ items }: { items: any[] }) => (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px' }}>
      {items.map((item) => {
        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
        const Icon = item.icon;
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '10px 4px',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              background: isActive ? 'var(--badge-culprit-bg)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
              borderRadius: '4px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--button-ghost-hover)';
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} color="currentColor" />
            <span style={{ fontSize: '9px', fontWeight: isActive ? 700 : 600, letterSpacing: '0.3px', textTransform: 'capitalize' }}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div style={{ position: 'relative', display: 'flex', zIndex: 1000, height: '100%' }}>
      <aside style={{
        width: isOpen ? '82px' : '0px',
        minWidth: isOpen ? '82px' : '0px',
        borderRight: isOpen ? '1px solid var(--border-color)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: isOpen ? '20px 0' : '0',
        background: 'var(--bg-sidebar)',
        alignItems: 'center',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isOpen ? 1 : 0,
        boxShadow: isOpen ? 'var(--shadow-sm)' : 'none'
      }}>
        {/* Logo Area */}
        <Link href="/" style={{ 
          marginBottom: '28px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '4px',
          textDecoration: 'none' 
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'rgba(14, 165, 233, 0.12)',
            border: '1px solid var(--border-highlight)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)',
            boxShadow: '0 0 10px rgba(14, 165, 233, 0.2)'
          }}>
            <Radar size={18} />
          </div>
          <span style={{ 
            color: 'var(--accent-cyan)', 
            fontWeight: 800, 
            fontSize: '13px', 
            letterSpacing: '1.2px',
            textTransform: 'uppercase'
          }}>
            Kairos
          </span>
        </Link>

        <div style={{ flex: 1, width: '100%', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease', transitionDelay: isOpen ? '0.1s' : '0s' }}>
          <NavGroup items={topNavItems} />
        </div>

        <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '12px', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease', transitionDelay: isOpen ? '0.1s' : '0s' }}>
          <NavGroup items={bottomNavItems} />
        </div>
      </aside>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: isOpen ? '-14px' : '-28px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 10
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--border-highlight)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
        title={isOpen ? "Collapse Navigation" : "Expand Navigation"}
      >
        {isOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>
    </div>
  );
}
