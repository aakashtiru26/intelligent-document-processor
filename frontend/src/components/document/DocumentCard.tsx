'use client';
import { motion } from 'framer-motion';
import { Document } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  document: Document;
  isSelected: boolean;
  processingInfo?: { progress: number; message: string; step: string };
  onSelect: () => void;
  onDelete: () => void;
}

const TYPE_ICONS: Record<string,string> = { invoice:'🧾', receipt:'🏷️', kyc_form:'🪪', bank_statement:'🏦', business_document:'📋', unknown:'📄' };

function bytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)}KB`;
  return `${(b/1024/1024).toFixed(1)}MB`;
}

export default function DocumentCard({ document, isSelected, processingInfo, onSelect, onDelete }: Props) {
  const isProcessing = document.status === 'processing' || !!processingInfo;
  const icon = TYPE_ICONS[document.document_type || 'unknown'] || '📄';
  const conf = document.confidence_score;
  const confColor = conf ? (conf > 0.7 ? '#10b981' : conf > 0.5 ? '#f59e0b' : '#ef4444') : '#9ca3af';

  const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); if (confirm('Delete this document?')) onDelete(); };

  const canOpen = document.status === 'completed';

  return (
    <div className={`doc-card ${isSelected ? 'selected' : ''} ${!canOpen && !isProcessing ? 'not-clickable' : ''}`}
      onClick={canOpen ? onSelect : undefined}
      style={{ cursor: canOpen ? 'pointer' : 'default' }}>
      <div className="doc-card-head">
        <div className="doc-type-icon">{icon}</div>
        <div className="doc-head-right">
          <div className={`doc-status ${document.status}`}>
            {document.status === 'completed' ? '✅' : document.status === 'processing' ? '⚙️' : document.status === 'failed' ? '❌' : '⏳'}
            {' '}{isProcessing ? 'Processing' : document.status}
          </div>
          <button className="doc-delete-btn" onClick={handleDelete} title="Delete">✕</button>
        </div>
      </div>

      <div className="doc-filename" title={document.original_filename}>{document.original_filename}</div>

      <div className="doc-meta">
        <span>{bytes(document.file_size)}</span>
        {document.page_count && <><span className="doc-meta-sep">·</span><span>{document.page_count}p</span></>}
        {document.processing_time && <><span className="doc-meta-sep">·</span><span>⚡{document.processing_time}s</span></>}
        <span className="doc-meta-sep">·</span>
        <span>{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
      </div>

      {document.document_type && (
        <div style={{ marginBottom: '10px' }}>
          <span className="doc-type-badge">{document.document_type.replace(/_/g,' ')}</span>
        </div>
      )}

      {isProcessing && processingInfo && (
        <div className="doc-progress">
          <div className="doc-progress-label">
            <span>{processingInfo.message}</span>
            <span>{processingInfo.progress}%</span>
          </div>
          <div className="doc-progress-bar">
            <motion.div className="doc-progress-fill" animate={{ width: `${processingInfo.progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}

      {conf !== null && document.status === 'completed' && (
        <div className="doc-confidence">
          <span className="conf-label">Confidence</span>
          <div className="conf-bar-wrap">
            <div className="conf-bar">
              <div className="conf-fill" style={{ width: `${conf*100}%`, background: confColor }} />
            </div>
            <span className="conf-pct" style={{ color: confColor }}>{Math.round(conf*100)}%</span>
          </div>
        </div>
      )}

      {document.status === 'completed' && (
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
          Click to view results →
        </div>
      )}
    </div>
  );
}
