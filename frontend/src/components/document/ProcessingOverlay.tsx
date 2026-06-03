'use client';
import { motion } from 'framer-motion';

interface Props { docId: string; progress: number; message: string; step: string; }

const STEPS = ['init','ocr','classify','ner','fields','keywords','summary','scoring'];

export default function ProcessingOverlay({ docId, progress, message, step }: Props) {
  const stepIdx = STEPS.indexOf(step);
  return (
    <div className="proc-card">
      <div className="proc-spinner" />
      <div className="proc-info">
        <div className="proc-name">Processing · {docId.slice(0,8)}...</div>
        <div className="proc-msg">{message}</div>
        <div className="proc-bar-wrap">
          <motion.div className="proc-bar" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <div style={{ display:'flex', gap:3, marginTop:6 }}>
          {STEPS.map((s,i) => (
            <div key={s} style={{ flex:1, height:3, borderRadius:99, background: i<=stepIdx ? '#6366f1' : 'rgba(99,102,241,0.12)', transition:'background 0.3s' }} />
          ))}
        </div>
      </div>
      <div className="proc-pct">{progress}%</div>
    </div>
  );
}
