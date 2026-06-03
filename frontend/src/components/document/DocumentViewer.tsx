'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Document, documentsApi } from '@/lib/api';

interface Props { document: Document; onClose: () => void; onDelete: () => void; }

const TYPE_ICONS: Record<string,string> = { invoice:'🧾', receipt:'🏷️', kyc_form:'🪪', bank_statement:'🏦', business_document:'📋', unknown:'📄' };
const ENTITY_ICONS: Record<string,string> = { persons:'👤', organizations:'🏢', locations:'📍', dates:'📅', money:'💰', misc:'🏷️' };

function ConfGauge({ value }: { value: number }) {
  const pct = Math.round(value*100);
  const color = pct>=75?'#10b981':pct>=50?'#f59e0b':'#ef4444';
  const r=22, c=2*Math.PI*r, d=(pct/100)*c;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="5"/>
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${d} ${c}`} strokeLinecap="round" transform="rotate(-90 30 30)"
          style={{ transition:'stroke-dasharray 1s ease' }}/>
        <text x="30" y="35" textAnchor="middle" fill={color} fontSize="13" fontWeight="800" fontFamily="JetBrains Mono,monospace">{pct}%</text>
      </svg>
      <span style={{ fontSize:10, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>Confidence</span>
    </div>
  );
}

const TABS = [
  { id:'overview', label:'📊 Overview' },
  { id:'text', label:'📝 Raw Text' },
  { id:'fields', label:'🗂️ Fields' },
  { id:'entities', label:'🏷️ Entities' },
  { id:'keywords', label:'🔑 Keywords' },
] as const;

export default function DocumentViewer({ document, onClose, onDelete }: Props) {
  const [tab, setTab] = useState<'overview'|'text'|'fields'|'entities'|'keywords'>('overview');

  return (
    <>
      <motion.div className="viewer-backdrop" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} />
      <motion.div className="viewer-panel" initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', damping:28, stiffness:280 }}>

        <div className="viewer-header">
          <div className="viewer-header-top">
            <div className="viewer-title-group">
              <span className="viewer-doc-icon">{TYPE_ICONS[document.document_type||'unknown']}</span>
              <div style={{ minWidth:0 }}>
                <div className="viewer-filename" title={document.original_filename}>{document.original_filename}</div>
                <div className="viewer-meta">
                  {document.document_type && <span className="tag-sm tag-indigo">{document.document_type.replace(/_/g,' ')}</span>}
                  {document.page_count && <span className="tag-sm" style={{ background:'rgba(0,0,0,0.05)', color:'#6b7280' }}>{document.page_count}p</span>}
                  {document.processing_time && <span className="tag-sm" style={{ background:'rgba(0,0,0,0.05)', color:'#6b7280' }}>⚡{document.processing_time}s</span>}
                </div>
              </div>
            </div>
            <button className="viewer-close" onClick={onClose}>✕</button>
          </div>
          <div className="viewer-tabs">
            {TABS.map(t => <button key={t.id} className={`viewer-tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
          </div>
        </div>

        <div className="viewer-body">

          {/* OVERVIEW */}
          {tab==='overview' && (
            <div>
              {(document.confidence_score!==null || document.summary) && (
                <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'flex-start' }}>
                  {document.confidence_score!==null && <ConfGauge value={document.confidence_score} />}
                  {document.summary && (
                    <div className="summary-card" style={{ flex:1 }}>
                      <div className="summary-label">🤖 AI Summary</div>
                      <div className="summary-text">{document.summary}</div>
                    </div>
                  )}
                </div>
              )}

              {document.raw_text && (
                <div className="overview-grid" style={{ marginBottom:16 }}>
                  {[
                    { l:'Characters', v: document.raw_text.length.toLocaleString(), c:'#6366f1' },
                    { l:'Words', v: document.raw_text.split(/\s+/).filter(Boolean).length.toLocaleString(), c:'#10b981' },
                    { l:'Pages', v: document.page_count ?? 1, c:'#f59e0b' },
                    { l:'Process Time', v: document.processing_time ? `${document.processing_time}s` : '—', c:'#ec4899' },
                  ].map(s => (
                    <div key={s.l} className="overview-card">
                      <div className="overview-card-label">{s.l}</div>
                      <div className="overview-card-val" style={{ color:s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {document.field_confidences && Object.keys(document.field_confidences).length>0 && (
                <div className="conf-section">
                  <div className="conf-section-title">Field Confidence Scores</div>
                  {Object.entries(document.field_confidences).slice(0,8).map(([f,c]) => {
                    const pct = Math.round((c as number)*100);
                    const color = pct>=75?'#10b981':pct>=50?'#f59e0b':'#ef4444';
                    return (
                      <div key={f} className="conf-row">
                        <div className="conf-row-label" style={{ textTransform:'capitalize' }}>{f.replace(/_/g,' ')}</div>
                        <div className="conf-row-bar"><div className="conf-row-fill" style={{ width:`${pct}%`, background:color }} /></div>
                        <div className="conf-row-pct" style={{ color }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {document.error_message && (
                <div className="error-card">
                  <div className="error-label">❌ Error</div>
                  <div className="error-msg">{document.error_message}</div>
                </div>
              )}
            </div>
          )}

          {/* TEXT */}
          {tab==='text' && (
            document.raw_text
              ? <pre className="text-block">{document.raw_text}</pre>
              : <div style={{ color:'#9ca3af', textAlign:'center', padding:'40px 0' }}>No text extracted</div>
          )}

          {/* FIELDS */}
          {tab==='fields' && (
            document.structured_data && Object.keys(document.structured_data).length>0
              ? Object.entries(document.structured_data).map(([field,value]) => (
                <div key={field} className="field-card">
                  <div className="field-card-header">
                    <div className="field-name">{field.replace(/_/g,' ')}</div>
                    {document.field_confidences?.[field] && (
                      <div className="field-conf">{Math.round((document.field_confidences[field] as number)*100)}%</div>
                    )}
                  </div>
                  {Array.isArray(value)
                    ? <div style={{ fontSize:12.5, color:'#374151' }}>{value.slice(0,8).map((item,i) => <div key={i} style={{ padding:'3px 0', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>{typeof item==='object'?JSON.stringify(item):String(item)}</div>)}</div>
                    : <div className="field-val">{String(value)}</div>
                  }
                </div>
              ))
              : <div style={{ color:'#9ca3af', textAlign:'center', padding:'40px 0' }}>No structured fields extracted</div>
          )}

          {/* ENTITIES */}
          {tab==='entities' && (
            document.entities && Object.values(document.entities).some(v => (v as string[]).length>0)
              ? Object.entries(document.entities).map(([type, values]) => {
                const vals = values as string[];
                if (!vals.length) return null;
                return (
                  <div key={type} className="entity-section">
                    <div className="entity-section-head">
                      <span>{ENTITY_ICONS[type]||'🏷️'}</span>
                      <span className="entity-type-label">{type}</span>
                      <span className="entity-count">{vals.length}</span>
                    </div>
                    <div className="entity-tags">
                      {vals.map((v,i) => <span key={i} className="entity-tag">{v}</span>)}
                    </div>
                  </div>
                );
              })
              : <div style={{ color:'#9ca3af', textAlign:'center', padding:'40px 0' }}>No entities extracted</div>
          )}

          {/* KEYWORDS */}
          {tab==='keywords' && (
            document.keywords && document.keywords.length>0
              ? document.keywords.map((kw,i) => (
                <div key={i} className="kw-row">
                  <div className="kw-rank">#{i+1}</div>
                  <div className="kw-word">{kw.word}</div>
                  <div className="kw-bar-wrap">
                    <div className="kw-bar-fill" style={{ width:`${(kw.score/(document.keywords![0].score||1))*100}%` }} />
                  </div>
                  <div className="kw-count">{kw.count}</div>
                </div>
              ))
              : <div style={{ color:'#9ca3af', textAlign:'center', padding:'40px 0' }}>No keywords extracted</div>
          )}
        </div>

        {document.status==='completed' && (
          <div className="viewer-footer">
            <a href={documentsApi.exportJson(document.id)} download className="export-btn export-json">↓ Export JSON</a>
            <a href={documentsApi.exportCsv(document.id)} download className="export-btn export-csv">↓ Export CSV</a>
            <button className="delete-btn-sm" onClick={onDelete}>🗑️</button>
          </div>
        )}
      </motion.div>
    </>
  );
}
