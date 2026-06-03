'use client';
import { motion } from 'framer-motion';
import { StatsResponse } from '@/lib/api';

interface StatsBarProps {
  stats: StatsResponse | null;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const items = [
    {
      label: 'Total Documents',
      value: stats?.total_documents ?? '—',
      icon: '📁',
      color: '#6060a0',
    },
    {
      label: 'Completed',
      value: stats?.completed ?? '—',
      icon: '✅',
      color: '#10b981',
    },
    {
      label: 'Avg Confidence',
      value: stats?.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(1)}%` : '—',
      icon: '🎯',
      color: '#f59e0b',
    },
    {
      label: 'Avg Process Time',
      value: stats?.avg_processing_time ? `${stats.avg_processing_time.toFixed(1)}s` : '—',
      icon: '⚡',
      color: '#a78bfa',
    },
    {
      label: 'Failed',
      value: stats?.failed ?? '—',
      icon: '❌',
      color: '#f43f5e',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
      {items.map((item, i) => (
        <motion.div key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="p-4 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">{item.icon}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: item.color, fontFamily: 'var(--font-display)' }}>
            {item.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
