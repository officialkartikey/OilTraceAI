"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Home, Search, FileText, Settings, Activity, HelpCircle, Server, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const topNavItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Observations', path: '/observations', icon: Search }, // Used Search as fallback for eye
    { name: 'Vessels', path: '/vessels', icon: FileText }, // Fallback for ship
    { name: 'Investigations', path: '/investigations', icon: Search },
    { name: 'Intelligence', path: '/intelligence', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const bottomNavItems = [
    { name: 'System Status', path: '/status', icon: Server },
    { name: 'Help', path: '/help', icon: HelpCircle },
  ];

  const NavGroup = ({ items }: { items: any[] }) => (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item) => {
        // Simple active check for prototype
        const isActive = pathname.startsWith(item.path) && (item.path !== '/' || pathname === '/');
        const Icon = item.icon;
        return (
          <Link key={item.path} href={item.path} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '12px 4px',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            textDecoration: 'none',
            position: 'relative'
          }}>
            <Icon size={20} color="currentColor" />
            <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'capitalize' }}>
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
        width: isOpen ? '80px' : '0px',
        minWidth: isOpen ? '80px' : '0px',
        borderRight: isOpen ? '1px solid var(--border-color)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: isOpen ? '24px 0' : '0',
        background: 'var(--bg-sidebar)',
        alignItems: 'center',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        opacity: isOpen ? 1 : 0
      }}>
        {/* Logo Area */}
        <div style={{ marginBottom: '32px', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '18px', letterSpacing: '1px' }}>
          Kairos
        </div>

        <div style={{ flex: 1, width: '100%', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease', transitionDelay: isOpen ? '0.1s' : '0s' }}>
          <NavGroup items={topNavItems} />
        </div>

        <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '16px', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease', transitionDelay: isOpen ? '0.1s' : '0s' }}>
          <NavGroup items={bottomNavItems} />
        </div>
      </aside>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: isOpen ? '-14px' : '-28px',
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>
    </div>
  );
}
