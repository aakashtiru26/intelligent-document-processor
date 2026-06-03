'use client';
import { motion } from 'framer-motion';
import { Document } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  document: Document; isSelected: boolean;
  processingInfo?: { progress: number; message: string; step: string };
  view: 'grid' | 'list'; onSelect: () => void; onDelete: () => void;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 's-pending'    },
  processing: { label: 'Processing', cls: 's-processing' },
  completed:  { label: 'Done',       cls: 's-completed'  },
  failed:     { label: 'Failed',     cls: 's-failed'     },
};

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice', receipt: 'Receipt', kyc_form: 'KYC Form',
  bank_statement: 'Bank Statement', business_document: 'Business Doc', unknown: 'Unknown',
};

function fmtBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b/1024).toFixed(0)}KB`;
  return `${(b/1048576).toFixed(1)}MB`;
}

export default function DocumentCard({ document, isSelected, processingInfo, view, onSelect, onDelete }: Props) {
  const s = STATUS[document.status] || STATUS.pending;
  const isProc = document.status === 'processing' || !!processingInfo;
  const conf = document.confidence_score;
  const typeLabel = TYPE_LABEL[document.document_type || 'unknown'] || document.document_type || '—';

  const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); if (confirm('Delete?')) onDelete(); };

  const baseStyle: React.CSSProperties = {
    cursor: 'pointer', background: 'var(--black-2)',
    border: `1px solid ${isSelected ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
    borderRadius: '10px',
    transition: 'border-color 0.15s, background 0.15s',
    position: 'relative',
  };

  if (view === 'list') {
    return (
      <div onClick={onSelect} style={{ ...baseStyle, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}
        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="clip" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
            {document.original_filename}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {fmtBytes(document.file_size)}{document.page_count ? ` · ${document.page_count}p` : ''}
            {' · '}{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
          </p>
        </div>
        {isProc && processingInfo && (
          <div style={{ width: 72, flexShrink: 0 }}>
            <div className="prog-track"><div className="prog-fill" style={{ width: `${processingInfo.progress}%` }} /></div>
            <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)', textAlign: 'right', marginTop: 2 }}>{processingInfo.progress}%</p>
          </div>
        )}
        {conf !== null && document.status === 'completed' && (
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: conf > 0.7 ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }}>
            {(conf * 100).toFixed(0)}%
          </span>
        )}
        <span className={`tag ${s.cls}`} style={{ flexShrink: 0 }}>{s.label}</span>
        <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, padding: '2px 4px', flexShrink: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>×</button>
      </div>
    );
  }

  return (
    <div onClick={onSelect} style={{ ...baseStyle, padding: 16 }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span className={`tag ${s.cls}`}>{isProc ? 'Processing' : s.label}</span>
        <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, lineHeight: 1, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>×</button>
      </div>

      {/* Filename */}
      <p className="clip" title={document.original_filename} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
        {document.original_filename}
      </p>

      {/* Meta */}
      <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
        {fmtBytes(document.file_size)}{document.page_count ? ` · ${document.page_count}p` : ''}{document.processing_time ? ` · ${document.processing_time}s` : ''}
      </p>

      {/* Progress */}
      {isProc && processingInfo && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{processingInfo.message}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{processingInfo.progress}%</span>
          </div>
          <div className="prog-track">
            <motion.div className="prog-fill" animate={{ width: `${processingInfo.progress}%` }} transition={{ duration: 0.35 }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="tag" style={{ background: 'var(--black-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
          {typeLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {conf !== null && document.status === 'completed' && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: conf > 0.7 ? 'var(--green)' : 'var(--amber)' }}>
              {(conf * 100).toFixed(0)}%
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}