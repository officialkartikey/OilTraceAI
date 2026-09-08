"use client";
import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: number;
}

export default function ThemeToggle({ className, size = 18 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';
  const tooltipText = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={tooltipText}
      aria-label={tooltipText}
      className={className}
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
      onMouseOver={(e) => {
        e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.background = 'var(--button-ghost-hover)';
        e.currentTarget.style.borderColor = 'var(--border-highlight)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'var(--border-color)';
      }}
    >
      {mounted ? (
        isDark ? (
          <Sun size={size} color="var(--accent-yellow)" />
        ) : (
          <Moon size={size} color="var(--accent-blue)" />
        )
      ) : (
        <Sun size={size} color="var(--accent-yellow)" style={{ opacity: 0.8 }} />
      )}
    </button>
  );
}
