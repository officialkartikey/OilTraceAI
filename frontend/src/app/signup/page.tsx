"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, Users, Key } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [userType, setUserType] = useState('Analyst');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/').replace(/\/+$/, '');
      const baseUrl = rawBase.endsWith('/investigations') ? rawBase.slice(0, -'/investigations'.length) : rawBase;
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, userType, secret_key: secretKey })
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(data.message); // In a real app, you'd show this in a nice UI component, but alert is fine for now to stop them from immediately navigating without knowing
        router.push('/login');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.08) 0%, transparent 60%)', zIndex: 0 }} />

      {/* Floating Theme Toggle in Top Right */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 20 }}>
        <ThemeToggle />
      </div>

      <div className="tactical-panel" style={{ width: '420px', padding: '40px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-modal)' }}>
        
        <div style={{ width: '48px', height: '48px', border: '2px solid var(--accent-blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', background: 'rgba(14, 165, 233, 0.1)' }}>
          <Shield size={28} color="var(--accent-blue)" />
        </div>
        
        <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px', color: 'var(--text-primary)', marginBottom: '6px' }}>Kairos SIGNUP</h1>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '28px' }}>Request Access Credentials</p>

        {error && (
          <div style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: '4px', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', top: '13px', left: '12px' }} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '11px 12px 11px 40px', 
                background: 'var(--input-bg)', 
                border: '1px solid var(--input-border)', 
                color: 'var(--text-primary)', 
                borderRadius: '4px', 
                outline: 'none',
                fontSize: '13px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--input-border)')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', top: '13px', left: '12px' }} />
            <input 
              type="password" 
              placeholder="Desired Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '11px 12px 11px 40px', 
                background: 'var(--input-bg)', 
                border: '1px solid var(--input-border)', 
                color: 'var(--text-primary)', 
                borderRadius: '4px', 
                outline: 'none',
                fontSize: '13px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--input-border)')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', top: '13px', left: '12px' }} />
            <input 
              type="password" 
              placeholder="Super Secret Key" 
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '11px 12px 11px 40px', 
                background: 'var(--input-bg)', 
                border: '1px solid var(--input-border)', 
                color: 'var(--text-primary)', 
                borderRadius: '4px', 
                outline: 'none',
                fontSize: '13px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--input-border)')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Users size={16} color="var(--text-muted)" style={{ position: 'absolute', top: '13px', left: '12px' }} />
            <select 
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '11px 12px 11px 40px', 
                background: 'var(--input-bg)', 
                border: '1px solid var(--input-border)', 
                color: 'var(--text-primary)', 
                borderRadius: '4px', 
                outline: 'none', 
                appearance: 'none', 
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--input-border)')}
            >
              <option value="Analyst" style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>Analyst</option>
              <option value="Administrator" style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>Administrator</option>
              <option value="Field Agent" style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>Field Agent</option>
              <option value="Commander" style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>Commander</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginTop: '8px', 
              background: 'var(--accent-blue)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 700, 
              fontSize: '12px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              cursor: 'pointer', 
              transition: 'opacity 0.2s', 
              opacity: loading ? 0.7 : 1 
            }}
          >
            {loading ? 'Processing...' : 'Submit Request'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Already have credentials? <Link href="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Login here →</Link>
        </div>
      </div>
    </div>
  );
}
