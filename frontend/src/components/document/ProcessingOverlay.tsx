'use client';
import { motion } from 'framer-motion';

const STEPS: Record<string, string> = {
  init: 'Initializing', ocr: 'Running OCR', classify: 'Classifying document',
  ner: 'Extracting entities', fields: 'Parsing structured fields',
  keywords: 'Extracting keywords', summary: 'Generating summary',
  scoring: 'Calculating confidence', complete: 'Complete',
};

export default function ProcessingOverlay({ docId, progress, message, step }: {
  docId: string; progress: number; message: string; step: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      style={{
        background: 'var(--black-2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div className="spin" style={{
        width: 14, height: 14, flexShrink: 0, borderRadius: '50%',
        border: '1.5px solid var(--border-light)', borderTopColor: 'var(--green)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{STEPS[step] || step}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{progress}%</span>
        </div>
        <div className="prog-track">
          <motion.div className="prog-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
        </div>
      </div>
    </motion.div>
  );
}