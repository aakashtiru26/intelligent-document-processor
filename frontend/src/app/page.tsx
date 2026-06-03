'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { documentsApi, Document, StatsResponse } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import UploadZone from '@/components/document/UploadZone';
import DocumentCard from '@/components/document/DocumentCard';
import DocumentViewer from '@/components/document/DocumentViewer';
import ProcessingOverlay from '@/components/document/ProcessingOverlay';

function getClientId() {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem('idps_client_id');
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('idps_client_id', id); }
  return id;
}

export default function Home() {
  const clientId = useRef('');
  useEffect(() => { clientId.current = getClientId(); }, []);
  const { connected, lastUpdate } = useWebSocket(clientId.current || 'init');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingDocs, setProcessingDocs] = useState<Record<string, { progress: number; message: string; step: string }>>({});
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const params: any = { skip: page * 12, limit: 12 };
      if (filter !== 'all') params.status = filter;
      const res = await documentsApi.list(params);
      setDocuments(res.data.documents);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  }, [page, filter]);

  const fetchStats = useCallback(async () => {
    try { const res = await documentsApi.stats(); setStats(res.data); } catch {}
  }, []);

  useEffect(() => {
    fetchDocuments(); fetchStats();
    const i = setInterval(fetchStats, 30000);
    return () => clearInterval(i);
  }, [fetchDocuments, fetchStats]);

  useEffect(() => {
    if (!lastUpdate) return;
    if (lastUpdate.type === 'processing_update') {
      setProcessingDocs(prev => ({ ...prev, [lastUpdate.document_id]: { progress: lastUpdate.progress || 0, message: lastUpdate.message || '', step: lastUpdate.step || '' } }));
    } else if (lastUpdate.type === 'processing_complete') {
      setProcessingDocs(prev => { const n = { ...prev }; delete n[lastUpdate.document_id]; return n; });
      toast.success('✨ Document processed!');
      fetchDocuments(); fetchStats();
      if (selectedDoc?.id === lastUpdate.document_id && lastUpdate.document) setSelectedDoc(lastUpdate.document);
    } else if (lastUpdate.type === 'processing_error') {
      setProcessingDocs(prev => { const n = { ...prev }; delete n[lastUpdate.document_id]; return n; });
      toast.error('Processing failed'); fetchDocuments();
    }
  }, [lastUpdate, fetchDocuments, fetchStats, selectedDoc?.id]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} file(s)...`);
    try {
      if (files.length === 1) {
        const res = await documentsApi.upload(files[0], clientId.current);
        setProcessingDocs(prev => ({ ...prev, [res.data.document_id]: { progress: 0, message: 'Queued...', step: 'init' } }));
      } else {
        const res = await documentsApi.batchUpload(files, clientId.current);
        res.data.documents.forEach((d: any) => { setProcessingDocs(prev => ({ ...prev, [d.document_id]: { progress: 0, message: 'Queued...', step: 'init' } })); });
      }
      toast.success('Uploaded! Processing now...', { id: toastId });
      await fetchDocuments();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed', { id: toastId }); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await documentsApi.delete(id); toast.success('Deleted'); if (selectedDoc?.id === id) setSelectedDoc(null); fetchDocuments(); fetchStats(); }
    catch { toast.error('Delete failed'); }
  };

  const handleSelect = async (doc: Document) => {
    if (doc.status !== 'completed') return;
    try { const res = await documentsApi.get(doc.id); setSelectedDoc(res.data); }
    catch { setSelectedDoc(doc); }
  };

  return (
    <div className="idps-root">
      <div className="mesh-bg" aria-hidden="true">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" /><div className="blob blob-4" />
      </div>
      <header className="site-header">
        <div className="header-inner">
          <div className="logo-group">
            <div className="logo-mark">⚡</div>
            <div><div className="logo-name">IDPS</div><div className="logo-tagline">Intelligent Document Processing</div></div>
          </div>
          <div className="header-actions">
            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/docs`} target="_blank" rel="noopener noreferrer" className="btn-ghost">📋 API Docs</a>
            <div className={`status-badge ${connected ? 'online' : 'offline'}`}><span className="status-dot" />{connected ? 'Live' : 'Offline'}</div>
          </div>
        </div>
      </header>
      <main className="main-wrap">
        <motion.section className="hero-section" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="hero-chip">✨ AI-Powered · Real-time · Production Ready</div>
          <h1 className="hero-headline">Turn Documents Into<br /><em>Structured Intelligence</em></h1>
          <p className="hero-body">Upload invoices, receipts, KYC forms & bank statements. Get extracted data, named entities, summaries & confidence scores — instantly.</p>
          <div className="hero-features">
            {['🔍 OCR + Image Preprocessing','🧠 NLP & Named Entities','📊 Structured Field Extraction','⚡ Real-time WebSocket Updates'].map(f => (
              <span key={f} className="feature-tag">{f}</span>
            ))}
          </div>
        </motion.section>

        <motion.div className="stats-band" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {[
            { icon: '📁', label: 'Total Docs', val: stats?.total_documents ?? 0, color: '#6366f1' },
            { icon: '✅', label: 'Completed', val: stats?.completed ?? 0, color: '#10b981' },
            { icon: '🎯', label: 'Avg Accuracy', val: stats?.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(0)}%` : '—', color: '#f59e0b' },
            { icon: '⚡', label: 'Avg Speed', val: stats?.avg_processing_time ? `${stats.avg_processing_time.toFixed(1)}s` : '—', color: '#ec4899' },
            { icon: '❌', label: 'Failed', val: stats?.failed ?? 0, color: '#ef4444' },
          ].map((s, i) => (
            <motion.div key={s.label} className="stat-tile" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i + 0.3 }}>
              <span className="stat-emoji">{s.icon}</span>
              <span className="stat-num" style={{ color: s.color }}>{s.val}</span>
              <span className="stat-lbl">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <UploadZone onUpload={handleUpload} uploading={uploading} />
        </motion.div>

        <AnimatePresence>
          {Object.keys(processingDocs).length > 0 && (
            <motion.div className="proc-band" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {Object.entries(processingDocs).map(([docId, info]) => (
                <ProcessingOverlay key={docId} docId={docId} {...info} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="library-section">
          <div className="library-header">
            <div className="library-title-group">
              <h2 className="library-title">Document Library</h2>
              <span className="doc-badge">{total}</span>
            </div>
            <div className="filter-row">
              {[['all','🗂️ All'],['completed','✅ Done'],['processing','⚙️ Active'],['failed','❌ Failed']].map(([f,label]) => (
                <button key={f} onClick={() => { setFilter(f); setPage(0); }} className={`flt-btn ${filter === f ? 'flt-active' : ''}`}>{label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="load-wrap"><div className="load-ring" /><p>Loading your documents...</p></div>
          ) : documents.length === 0 ? (
            <div className="empty-wrap">
              <div className="empty-emoji">🗃️</div>
              <h3>No documents yet</h3>
              <p>Drop a file above to get started</p>
            </div>
          ) : (
            <>
              <div className="docs-grid">
                <AnimatePresence mode="popLayout">
                  {documents.map((doc, i) => (
                    <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.04 }}>
                      <DocumentCard document={doc} isSelected={selectedDoc?.id === doc.id} processingInfo={processingDocs[doc.id]}
                        onSelect={() => handleSelect(doc)} onDelete={() => handleDelete(doc.id)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {total > 12 && (
                <div className="pager">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="pager-btn">← Prev</button>
                  <span className="pager-info">Page {page + 1} / {Math.ceil(total / 12)}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 12 >= total} className="pager-btn">Next →</button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <AnimatePresence>
        {selectedDoc && <DocumentViewer document={selectedDoc} onClose={() => setSelectedDoc(null)} onDelete={() => { handleDelete(selectedDoc.id); setSelectedDoc(null); }} />}
      </AnimatePresence>
    </div>
  );
}