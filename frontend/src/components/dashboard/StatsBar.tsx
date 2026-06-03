'use client';
import { StatsResponse } from '@/lib/api';

export default function StatsBar({ stats }: { stats: StatsResponse | null }) {
  const items = [
    { label: 'Total',          value: stats?.total_documents ?? '—', accent: false },
    { label: 'Completed',      value: stats?.completed ?? '—',       accent: true  },
    { label: 'Processing',     value: stats?.processing ?? '—',      accent: false },
    { label: 'Failed',         value: stats?.failed ?? '—',          accent: false },
    { label: 'Avg Confidence', value: stats ? `${(stats.avg_confidence * 100).toFixed(0)}%` : '—', accent: false },
    { label: 'Avg Time',       value: stats ? `${stats.avg_processing_time.toFixed(1)}s` : '—', accent: false },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(6,1fr)',
      border: '1px solid var(--border)', borderRadius: '10px',
      overflow: 'hidden', background: 'var(--black-2)',
    }}>
      {items.map((item, i) => (
        <div key={item.label} style={{
          padding: '18px 20px',
          borderRight: i < 5 ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {item.label}
          </div>
          <div style={{
            fontSize: 22, fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            color: item.accent ? 'var(--green)' : 'var(--text)',
            lineHeight: 1,
          }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}