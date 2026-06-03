'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Document, documentsApi } from '@/lib/api';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onDelete: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  invoice: '🧾', receipt: '🏷️', kyc_form: '🪪',
  bank_statement: '🏦', business_document: '📋', unknown: '📄',
};

function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e';
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(96,96,160,0.2)" strokeWidth="4" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 32 32)" />
        <text x="32" y="37" textAnchor="middle" fill={color}
          fontSize="13" fontWeight="bold" fontFamily="DM Mono, monospace">
          {pct}%
        </text>
      </svg>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Overall Confidence</span>
    </div>
  );
}

export default function DocumentViewer({ document, onClose, onDelete }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'text' | 'entities' | 'fields' | 'keywords'>('overview');

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'text', label: '📝 Raw Text' },
    { id: 'fields', label: '🗂️ Fields' },
    { id: 'entities', label: '🏷️ Entities' },
    { id: 'keywords', label: '🔑 Keywords' },
  ] as const;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-y-0 right-0 z-50 flex flex-col"
      style={{
        width: 'min(100vw, 640px)',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
      }}>

      {/* Header */}
      <div className="flex items-start justify-between p-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="text-2xl mt-0.5 flex-shrink-0">
            {TYPE_ICONS[document.document_type || 'unknown']}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold truncate text-base" title={document.original_filename}
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {document.original_filename}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {document.document_type && (
                <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                  style={{ background: 'rgba(96,96,160,0.15)', color: 'var(--text-secondary)', border: '1px solid rgba(96,96,160,0.2)' }}>
                  {document.document_type.replace('_', ' ')}
                </span>
              )}
              {document.page_count && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{document.page_count} page(s)</span>
              )}
              {document.processing_time && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⚡ {document.processing_time}s</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg flex-shrink-0 transition-all ml-3"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 flex-shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all font-medium"
            style={{
              background: activeTab === tab.id ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              border: activeTab === tab.id ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Confidence + Summary */}
            <div className="flex gap-4">
              {document.confidence_score !== null && (
                <div className="flex-shrink-0">
                  <ConfidenceGauge value={document.confidence_score} />
                </div>
              )}
              {document.summary && (
                <div className="flex-1 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>AI SUMMARY</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{document.summary}</p>
                </div>
              )}
            </div>

            {/* Field Confidence bars */}
            {document.field_confidences && Object.keys(document.field_confidences).length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>FIELD CONFIDENCE SCORES</p>
                <div className="space-y-2">
                  {Object.entries(document.field_confidences).slice(0, 8).map(([field, conf]) => (
                    <div key={field} className="flex items-center gap-3">
                      <span className="text-xs w-28 truncate capitalize" style={{ color: 'var(--text-secondary)' }}>
                        {field.replace('_', ' ')}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(96,96,160,0.15)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${(conf as number) * 100}%`,
                            background: (conf as number) > 0.7 ? 'var(--success)' : 'var(--warning)',
                          }} />
                      </div>
                      <span className="text-xs w-10 text-right" style={{ color: 'var(--text-muted)' }}>
                        {Math.round((conf as number) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
            {document.raw_text && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Characters', value: document.raw_text.length.toLocaleString() },
                  { label: 'Words', value: document.raw_text.split(/\s+/).length.toLocaleString() },
                  { label: 'Lines', value: document.raw_text.split('\n').length.toLocaleString() },
                ].map(stat => (
                  <div key={stat.label} className="p-3 rounded-xl text-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="text-lg font-bold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                      {stat.value}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {document.error_message && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#f43f5e' }}>ERROR</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{document.error_message}</p>
              </div>
            )}
          </div>
        )}

        {/* RAW TEXT TAB */}
        {activeTab === 'text' && (
          <div className="h-full">
            {document.raw_text ? (
              <pre className="text-xs leading-relaxed whitespace-pre-wrap p-4 rounded-xl overflow-auto"
                style={{
                  background: 'var(--bg-card)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', fontFamily: 'var(--font-geist-mono)',
                  maxHeight: '100%',
                }}>
                {document.raw_text}
              </pre>
            ) : (
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">No text extracted.</p>
            )}
          </div>
        )}

        {/* FIELDS TAB */}
        {activeTab === 'fields' && (
          <div className="space-y-3">
            {document.structured_data && Object.keys(document.structured_data).length > 0 ? (
              Object.entries(document.structured_data).map(([field, value]) => (
                <div key={field} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium uppercase tracking-wide capitalize"
                      style={{ color: 'var(--text-muted)' }}>
                      {field.replace(/_/g, ' ')}
                    </span>
                    {document.field_confidences?.[field] && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(245,158,11,0.1)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(245,158,11,0.2)',
                        }}>
                        {Math.round(document.field_confidences[field] * 100)}%
                      </span>
                    )}
                  </div>
                  {Array.isArray(value) ? (
                    <div className="space-y-1">
                      {value.slice(0, 10).map((item, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg"
                          style={{ background: 'rgba(96,96,160,0.08)', color: 'var(--text-secondary)' }}>
                          {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {String(value)}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">No structured fields extracted.</p>
            )}
          </div>
        )}

        {/* ENTITIES TAB */}
        {activeTab === 'entities' && (
          <div className="space-y-4">
            {document.entities && Object.entries(document.entities).some(([, v]) => (v as string[]).length > 0) ? (
              Object.entries(document.entities).map(([type, values]) => {
                const vals = values as string[];
                if (vals.length === 0) return null;
                const icons: Record<string, string> = {
                  persons: '👤', organizations: '🏢', locations: '📍',
                  dates: '📅', money: '💰', misc: '🏷️'
                };
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{icons[type] || '🏷️'}</span>
                      <p className="text-xs font-medium uppercase tracking-wide capitalize"
                        style={{ color: 'var(--text-muted)' }}>
                        {type} ({vals.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vals.map((val, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(96,96,160,0.1)', color: 'var(--text-secondary)', border: '1px solid rgba(96,96,160,0.15)' }}>
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">No entities extracted.</p>
            )}
          </div>
        )}

        {/* KEYWORDS TAB */}
        {activeTab === 'keywords' && (
          <div className="space-y-2">
            {document.keywords && document.keywords.length > 0 ? (
              <>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Top {document.keywords.length} keywords by frequency
                </p>
                {document.keywords.map((kw, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <span className="text-xs w-5 text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{kw.word}</span>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(96,96,160,0.2)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${(kw.score / (document.keywords![0].score || 1)) * 100}%`,
                        background: 'var(--accent)',
                      }} />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: 'var(--text-muted)' }}>{kw.count}</span>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">No keywords extracted.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {document.status === 'completed' && (
        <div className="p-4 flex-shrink-0 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--border)' }}>
          <a href={documentsApi.exportJson(document.id)} download
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-all"
            style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.3)' }}>
            ↓ Export JSON
          </a>
          <a href={documentsApi.exportCsv(document.id)} download
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-all"
            style={{ background: 'rgba(96,96,160,0.15)', color: 'var(--text-secondary)', border: '1px solid rgba(96,96,160,0.3)' }}>
            ↓ Export CSV
          </a>
          <button onClick={onDelete}
            className="py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
            🗑️
          </button>
        </div>
      )}
    </motion.div>
  );
}
