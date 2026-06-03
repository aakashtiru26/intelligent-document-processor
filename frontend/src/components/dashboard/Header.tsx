'use client';

interface HeaderProps { connected: boolean; }

export default function Header({ connected }: HeaderProps) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(10,10,10,0.9)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 32px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 20,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}>
          IDPS
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a
            href="/api/docs" target="_blank"
            style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            API
          </a>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: connected ? 'var(--green)' : 'var(--text-3)',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--text-3)',
              boxShadow: connected ? '0 0 5px var(--green)' : 'none',
              display: 'inline-block',
            }} />
            {connected ? 'connected' : 'offline'}
          </div>
        </div>
      </div>
    </nav>
  );
}