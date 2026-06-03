'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, documentsApi } from '@/lib/api';

interface Props { document: Document; onClose: () => void; onDelete: () => void; }

const TABS = [
  { id: 'overview',  label: '📊 Overview'  },
  { id: 'raw',       label: '📝 Raw Text'  },
  { id: 'fields',    label: '🗂️ Fields'    },
  { id: 'entities',  label: '🏷️ Entities'  },
  { id: 'keywords',  label: '🔑 Keywords'  },
];

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice', receipt: 'Receipt', kyc_form: 'KYC Form',
  bank_statement: 'Bank Statement', business_document: 'Business Document', unknown: 'Unknown',
};

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(2)} MB`;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0, width: 140, paddingTop: 1, textTransform: 'capitalize' }}>
        {label.replace(/_/g,' ')}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', flex: 1 }}>
        {String(value)}
      </span>
    </div>
  );
}

// Entity type labels for display
const ENTITY_LABELS: Record<string, string> = {
  persons: 'Persons',
  organizations: 'Organizations',
  locations: 'Locations',
  dates: 'Dates',
  money: 'Monetary Values',
  misc: 'Miscellaneous',
};

export default function DocumentViewer({ document, onClose, onDelete }: Props) {
  const [tab, setTab] = useState('overview');
  const conf = document.confidence_score;
  const typeLabel = TYPE_LABEL[document.document_type || 'unknown'] || document.document_type || 'Unknown';

  const handleDelete = () => { if (confirm('Delete this document?')) { onDelete(); onClose(); } };

  // Filter out entities that are likely misidentified (very short strings, numbers as names, etc.)
  const cleanEntities = document.entities
    ? Object.fromEntries(
        Object.entries(document.entities).map(([type, values]) => [
          type,
          Array.isArray(values)
            ? values.filter(v => {
                const s = String(v).trim();
                // Filter out very short strings, pure numbers, and strings that look like amounts
                if (s.length < 2) return false;
                if (/^\d+(\.\d+)?$/.test(s)) return false;
                if (/^[\d,]+\.\d{2}$/.test(s)) return false;
                return true;
              })
            : values
        ])
      )
    : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', zIndex: 200 }}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 520, maxWidth: '100vw',
          background: 'var(--black)',
          borderLeft: '1px solid var(--border)',
          zIndex: 201, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <p className="clip" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flex: 1, marginRight: 12 }}>
              {document.original_filename}
            </p>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {document.status === 'completed' && (
                <>
                  <a
                    href={documentsApi.exportJson(document.id)} target="_blank"
                    style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: 6, background: 'var(--black-3)', border: '1px solid var(--border)', color: 'var(--text-2)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    JSON
                  </a>
                  <a
                    href={documentsApi.exportCsv(document.id)} target="_blank"
                    style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: 6, background: 'var(--black-3)', border: '1px solid var(--border)', color: 'var(--text-2)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    CSV
                  </a>
                </>
              )}
              <button
                onClick={handleDelete}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = 'var(--red)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                Delete
              </button>
              <button onClick={onClose} style={{ fontSize: 16, padding: '2px 8px', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {typeLabel} · {document.status}{conf !== null ? ` · ${(conf*100).toFixed(0)}% confidence` : ''}
            {document.processing_time ? ` · ${document.processing_time}s` : ''}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
          padding: '0 24px', flexShrink: 0, overflowX: 'auto',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 14px',
                fontSize: 12, fontFamily: 'var(--font-body)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
                borderBottom: `1px solid ${tab === t.id ? 'var(--text)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >

              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div>
                  {document.summary && (
                    <div style={{ marginBottom: 24 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Summary</p>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, padding: '12px 14px', background: 'var(--black-2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        {document.summary}
                      </p>
                    </div>
                  )}
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Document Info</p>
                    <div style={{ background: 'var(--black-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 14px' }}>
                      <Row label="File name" value={document.original_filename} />
                      <Row label="Type" value={typeLabel} />
                      <Row label="Status" value={document.status} />
                      <Row label="File size" value={fmtBytes(document.file_size)} />
                      <Row label="Pages" value={document.page_count} />
                      <Row label="Processing time" value={document.processing_time ? `${document.processing_time}s` : null} />
                      <Row label="Confidence" value={conf !== null ? `${(conf*100).toFixed(1)}%` : null} />
                      <Row label="MIME type" value={document.mime_type} />
                    </div>
                  </div>
                  {document.error_message && (
                    <div style={{ padding: '12px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Error</p>
                      <p style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{document.error_message}</p>
                    </div>
                  )}
                </div>
              )}

              {/* RAW TEXT */}
              {tab === 'raw' && (
                <div>
                  {document.raw_text ? (
                    <pre style={{
                      fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
                      lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: 'var(--black-2)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '16px',
                    }}>
                      {document.raw_text}
                    </pre>
                  ) : (
                    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No text extracted.</p>
                  )}
                </div>
              )}

              {/* FIELDS */}
              {tab === 'fields' && (
                <div>
                  {document.structured_data && Object.keys(document.structured_data).length > 0 ? (
                    <>
                      <div style={{ background: 'var(--black-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 14px', marginBottom: 16 }}>
                        {Object.entries(document.structured_data).map(([k, v]) =>
                          k !== 'line_items' ? <Row key={k} label={k} value={v as string} /> : null
                        )}
                      </div>
                      {Array.isArray(document.structured_data.line_items) && document.structured_data.line_items.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                            Line Items
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {document.structured_data.line_items.map((item: any, i: number) => (
                              <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', background: 'var(--black-2)',
                                border: '1px solid var(--border)', borderRadius: '6px',
                              }}>
                                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.description}</span>
                                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{item.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No structured fields extracted.</p>
                  )}
                </div>
              )}

              {/* ENTITIES */}
              {tab === 'entities' && (
                <div>
                  {cleanEntities && Object.values(cleanEntities).some(v => Array.isArray(v) && v.length > 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {Object.entries(cleanEntities).map(([type, values]) =>
                        Array.isArray(values) && values.length > 0 ? (
                          <div key={type}>
                            <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                              {ENTITY_LABELS[type] || type}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {values.map((v, i) => (
                                <span key={i} className="tag" style={{ background: 'var(--black-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No entities extracted.</p>
                  )}
                </div>
              )}

              {/* KEYWORDS */}
              {tab === 'keywords' && (
                <div>
                  {document.keywords && document.keywords.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {document.keywords.slice(0, 25).map((kw, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '7px 12px', background: 'var(--black-2)',
                          border: '1px solid var(--border)', borderRadius: '6px',
                        }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', width: 20, textAlign: 'right', flexShrink: 0 }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{kw.word}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${kw.score * 1000}%`, maxWidth: '100%', background: 'var(--green)', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', width: 20, textAlign: 'right' }}>{kw.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No keywords extracted.</p>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}