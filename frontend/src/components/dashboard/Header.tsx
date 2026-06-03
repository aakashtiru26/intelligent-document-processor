'use client';
import { motion } from 'framer-motion';

interface HeaderProps {
  connected: boolean;
}

export default function Header({ connected }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 py-4 mb-2"
      style={{ background: 'rgba(10,10,26,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(96,96,160,0.15)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative w-10 h-10 flex items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(96,96,160,0.2))', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                IDPS
              </h1>
              <p className="text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                Intelligent Document Processing System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* API Docs link */}
            <a href="http://localhost:8000/api/docs" target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg transition-all hidden sm:flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <span>📋</span> API Docs
            </a>

            {/* WS status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <motion.div
                animate={{ scale: connected ? [1, 1.3, 1] : 1 }}
                transition={{ repeat: connected ? Infinity : 0, duration: 2 }}
                className="w-2 h-2 rounded-full"
                style={{ background: connected ? 'var(--success)' : '#5050a0' }} />
              <span className="text-xs hidden sm:block" style={{ color: connected ? 'var(--success)' : 'var(--text-muted)' }}>
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
