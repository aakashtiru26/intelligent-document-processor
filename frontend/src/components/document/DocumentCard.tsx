'use client';
import { motion } from 'framer-motion';
import { Document } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  processingInfo?: { progress: number; message: string; step: string };
  view: 'grid' | 'list';
  onSelect: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG = {
  pending: { color: '#6060a0', bg: 'rgba(96,96,160,0.1)', label: 'Pending', icon: '⏳' },
  processing: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Processing', icon: '⚙️' },
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Complete', icon: '✅' },
  failed: { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', label: 'Failed', icon: '❌' },
};

const TYPE_ICONS: Record<string, string> = {
  invoice: '🧾',
  receipt: '🏷️',
  kyc_form: '🪪',
  bank_statement: '🏦',
  business_document: '📋',
  unknown: '📄',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentCard({
  document, isSelected, processingInfo, view, onSelect, onDelete
}: DocumentCardProps) {
  const status = STATUS_CONFIG[document.status] || STATUS_CONFIG.pending;
  const typeIcon = TYPE_ICONS[document.document_type || 'unknown'] || '📄';
  const isProcessing = document.status === 'processing' || !!processingInfo;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this document?')) onDelete();
  };

  if (view === 'list') {
    return (
      <div onClick={onSelect} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
        style={{
          background: isSelected ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
          border: `1px solid ${isSelected ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
        }}>
        <div className="text-2xl w-10 text-center">{typeIcon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {document.original_filename}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {formatBytes(document.file_size)} · {document.page_count ? `${document.page_count}p` : ''} ·{' '}
            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
          </p>
        </div>
        {isProcessing && processingInfo && (
          <div className="w-24">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(96,96,160,0.2)' }}>
              <div className="h-full progress-bar rounded-full transition-all" style={{ width: `${processingInfo.progress}%` }} />
            </div>
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--accent)' }}>{processingInfo.progress}%</p>
          </div>
        )}
        {document.confidence_score !== null && document.status === 'completed' && (
          <div className="text-right">
            <div className="text-sm font-semibold" style={{ color: document.confidence_score > 0.7 ? '#10b981' : '#f59e0b' }}>
              {(document.confidence_score * 100).toFixed(0)}%
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>confidence</div>
          </div>
        )}
        <div className="px-2 py-1 rounded-full text-xs flex items-center gap-1"
          style={{ background: status.bg, color: status.color }}>
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
        <button onClick={handleDelete} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:opacity-100"
          style={{ color: 'var(--error)', background: 'rgba(244,63,94,0.1)' }}>
          🗑️
        </button>
      </div>
    );
  }

  return (
    <div onClick={onSelect} className="group relative p-4 rounded-xl cursor-pointer transition-all"
      style={{
        background: isSelected ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
        border: `1px solid ${isSelected ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
      }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: 'rgba(96,96,160,0.1)', border: '1px solid rgba(96,96,160,0.15)' }}>
          {typeIcon}
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
            style={{ background: status.bg, color: status.color }}>
            <span>{isProcessing ? '⚙️' : status.icon}</span>
            <span>{isProcessing ? 'Processing' : status.label}</span>
          </div>
          <button onClick={handleDelete}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--error)' }}>
            ✕
          </button>
        </div>
      </div>

      {/* Filename */}
      <p className="text-sm font-medium mb-1 truncate" title={document.original_filename}
        style={{ color: 'var(--text-primary)' }}>
        {document.original_filename}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        <span>{formatBytes(document.file_size)}</span>
        {document.page_count && <><span>·</span><span>{document.page_count}p</span></>}
        {document.processing_time && <><span>·</span><span>{document.processing_time}s</span></>}
      </div>

      {/* Progress bar for processing */}
      {isProcessing && processingInfo && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--accent)' }}>{processingInfo.message}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{processingInfo.progress}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(96,96,160,0.2)' }}>
            <motion.div className="h-full progress-bar rounded-full"
              animate={{ width: `${processingInfo.progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}

      {/* Confidence */}
      {document.confidence_score !== null && document.status === 'completed' && (
        <div className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Confidence</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(96,96,160,0.2)' }}>
              <div className="h-full rounded-full"
                style={{
                  width: `${document.confidence_score * 100}%`,
                  background: document.confidence_score > 0.7 ? 'var(--success)' : 'var(--warning)',
                }} />
            </div>
            <span className="text-xs font-medium"
              style={{ color: document.confidence_score > 0.7 ? '#10b981' : '#f59e0b' }}>
              {(document.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Type badge */}
      {document.document_type && (
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full capitalize"
            style={{ background: 'rgba(96,96,160,0.1)', color: 'var(--text-secondary)', border: '1px solid rgba(96,96,160,0.15)' }}>
            {document.document_type.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Time */}
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}
