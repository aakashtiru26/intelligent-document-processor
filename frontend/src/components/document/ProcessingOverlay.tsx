'use client';
import { motion } from 'framer-motion';

interface ProcessingOverlayProps {
  docId: string;
  progress: number;
  message: string;
  step: string;
}

const STEPS = ['init', 'ocr', 'classify', 'ner', 'fields', 'keywords', 'summary', 'scoring', 'complete'];

export default function ProcessingOverlay({ docId, progress, message, step }: ProcessingOverlayProps) {
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'rgba(245,158,11,0.4)', borderTopColor: 'transparent' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Processing Document</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {docId.slice(0, 8)}...</p>
          </div>
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(96,96,160,0.2)' }}>
        <motion.div className="h-full rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 mb-2">
        {STEPS.slice(0, -1).map((s, i) => (
          <div key={s} className="flex-1 h-0.5 rounded-full transition-all"
            style={{ background: i <= stepIndex ? 'var(--accent)' : 'rgba(96,96,160,0.2)' }} />
        ))}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}
