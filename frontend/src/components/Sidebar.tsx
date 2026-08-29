"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Home, Search, Eye, Ship, RotateCcw, Layers, Bell, FileText, Settings, Circle, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide sidebar on auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Investigations', path: '/investigations', icon: Search },
    { name: 'Observations', path: '/observations', icon: Eye },
    { name: 'Vessels', path: '/vessels', icon: Ship },
    { name: 'Reconstruction', path: '/reconstruction', icon: RotateCcw },
    { name: 'Evidence Fusion', path: '/evidence', icon: Layers },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside style={{
      width: '240px',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      background: 'var(--bg-panel)',
      zIndex: 1000,
      position: 'relative'
    }}>
      {/* Logo Area */}
      <div style={{ padding: '0 24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ 
            width: '32px', height: '32px', 
            border: '2px solid var(--accent-blue)', 
            borderRadius: '6px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <Shield size={20} color="var(--accent-blue)" />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '2px', margin: 0 }}>ARGUS</h1>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Maritime Intelligence &<br/>Source Attribution System
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 24px',
              background: isActive ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              if(!isActive) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }
            }}
            onMouseOut={(e) => {
              if(!isActive) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }
            }}>
              <Icon size={18} color={isActive ? 'var(--accent-blue)' : 'var(--text-muted)'} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status & User */}
      <div style={{ padding: '0 24px', marginTop: 'auto' }}>
        <div className="tactical-panel" style={{ padding: '12px', marginBottom: '24px', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            System Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--accent-green)' }}>
            <Circle size={10} fill="currentColor" />
            All Systems<br/>Operational
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '32px', height: '32px', 
              background: 'var(--border-color)', 
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 600
            }}>
              {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{session?.user?.email?.split('@')[0] || 'User'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{(session?.user as any)?.userType || 'Analyst'}</div>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
