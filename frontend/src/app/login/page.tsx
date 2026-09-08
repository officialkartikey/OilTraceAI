"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('verified') === 'true') {
      setSuccess('Email verified successfully. You may now log in.');
    }
    if (searchParams?.get('error') === 'InvalidToken') {
      setError('Invalid or expired verification link.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <>
      {error && (
        <div style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: '4px', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ width: '100%', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', borderRadius: '4px', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', top: '13px', left: '12px' }} />
          <input 
            type="email" 
            placeholder="Analyst Email" 
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
            placeholder="Authorization Key" 
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
          {loading ? 'Authenticating...' : 'Authenticate'}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', position: 'relative' }}>
      {/* Background styling to match tactical feel */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.08) 0%, transparent 60%)', zIndex: 0 }} />

      {/* Floating Theme Toggle in Top Right */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 20 }}>
        <ThemeToggle />
      </div>

      <div className="tactical-panel" style={{ width: '420px', padding: '40px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-modal)' }}>
        
        <div style={{ width: '48px', height: '48px', border: '2px solid var(--accent-blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', background: 'rgba(14, 165, 233, 0.1)' }}>
          <Shield size={28} color="var(--accent-blue)" />
        </div>
        
        <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px', color: 'var(--text-primary)', marginBottom: '6px' }}>Kairos LOGIN</h1>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '28px' }}>Secure Access Protocol</p>

        <Suspense fallback={<div style={{ color: 'var(--text-muted)' }}>Loading...</div>}>
          <LoginForm />
        </Suspense>

        <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Unauthorized access is strictly prohibited. <br/>
          <Link href="/signup" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Request Access (Sign Up) →</Link>
        </div>
      </div>
    </div>
  );
}
