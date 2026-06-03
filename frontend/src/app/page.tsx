'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { documentsApi, Document, StatsResponse } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import UploadZone from '@/components/document/UploadZone';
import DocumentCard from '@/components/document/DocumentCard';
import DocumentViewer from '@/components/document/DocumentViewer';
import StatsBar from '@/components/dashboard/StatsBar';
import ProcessingOverlay from '@/components/document/ProcessingOverlay';
import Header from '@/components/dashboard/Header';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'processing', label: 'Processing' },
  { id: 'failed', label: 'Failed' },
];

export default function Home() {
  const clientId = useRef(uuidv4()).current;
  const { connected, lastUpdate } = useWebSocket(clientId);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingDocs, setProcessingDocs] = useState<Record<string, { progress: number; message: string; step: string }>>({});
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchDocuments = useCallback(async () => {
    try {
      const params: Record<string, any> = { skip: page * 12, limit: 12 };
      if (filter !== 'all') params.status = filter;
      const res = await documentsApi.list(params);
      setDocuments(res.data.documents);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  const fetchStats = useCallback(async () => {
    try { const res = await documentsApi.stats(); setStats(res.data); } catch {}
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchDocuments, fetchStats]);

  useEffect(() => {
    if (!lastUpdate) return;
    if (lastUpdate.type === 'processing_update') {
      setProcessingDocs(prev => ({
        ...prev,
        [lastUpdate.document_id]: { progress: lastUpdate.progress || 0, message: lastUpdate.message || '', step: lastUpdate.step || '' },
      }));
    } else if (lastUpdate.type === 'processing_complete') {
      setProcessingDocs(prev => { const n = { ...prev }; delete n[lastUpdate.document_id]; return n; });
      toast.success('Document processed');
      fetchDocuments();
      fetchStats();
      if (selectedDoc?.id === lastUpdate.document_id && lastUpdate.document) setSelectedDoc(lastUpdate.document);
    } else if (lastUpdate.type === 'processing_error') {
      setProcessingDocs(prev => { const n = { ...prev }; delete n[lastUpdate.document_id]; return n; });
      toast.error(`Failed: ${lastUpdate.error}`);
      fetchDocuments();
    }
  }, [lastUpdate, fetchDocuments, fetchStats, selectedDoc?.id]);

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    const tid = toast.loading(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`);
    try {
      if (files.length === 1) {
        const res = await documentsApi.upload(files[0], clientId);
        setProcessingDocs(prev => ({ ...prev, [res.data.document_id]: { progress: 0, message: 'Queued', step: 'init' } }));
      } else {
        const res = await documentsApi.batchUpload(files, clientId);
        res.data.documents.forEach((d: any) =>
          setProcessingDocs(prev => ({ ...prev, [d.document_id]: { progress: 0, message: 'Queued', step: 'init' } }))
        );
      }
      toast.success('Uploaded — processing started', { id: tid });
      await fetchDocuments();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Upload failed', { id: tid });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentsApi.delete(id);
      toast.success('Deleted');
      if (selectedDoc?.id === id) setSelectedDoc(null);
      fetchDocuments(); fetchStats();
    } catch { toast.error('Delete failed'); }
  };

  const handleSelect = async (doc: Document) => {
    if (doc.status === 'completed') {
      try { const res = await documentsApi.get(doc.id); setSelectedDoc(res.data); }
      catch { setSelectedDoc(doc); }
    } else { setSelectedDoc(doc); }
  };

  const handleFilterChange = (f: string) => {
    if (f === filter) return;
    setFilter(f);
    setPage(0);
    setLoading(true);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header connected={connected} />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>

        {/* Page title */}
        <div style={{ padding: '40px 0 28px' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 36, fontWeight: 400, color: 'var(--text)',
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            Document Intelligence
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 480 }}>
            Upload any document — invoices, receipts, KYC forms, bank statements — and extract structured data using OCR and NLP.
          </p>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 24 }}>
          <StatsBar stats={stats} />
        </div>

        {/* Upload */}
        <div style={{ marginBottom: 40 }}>
          <UploadZone onUpload={handleUpload} />
        </div>

        {/* Processing */}
        <AnimatePresence>
          {Object.keys(processingDocs).length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {Object.entries(processingDocs).map(([id, info]) => (
                <ProcessingOverlay key={id} docId={id} {...info} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Documents section */}
        <div>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 400, color: 'var(--text)' }}>
                History
              </h2>
              {total > 0 && (
                <span className="tag" style={{ background: 'var(--black-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  {total}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Filters */}
              <div style={{ display: 'flex', background: 'var(--black-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: 3, gap: 2 }}>
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleFilterChange(f.id)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 12,
                      background: filter === f.id ? 'var(--black-4)' : 'transparent',
                      color: filter === f.id ? 'var(--text)' : 'var(--text-3)',
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font)',
                      boxShadow: filter === f.id ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                      transition: 'all 0.12s',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* View */}
              <div style={{ display: 'flex', background: 'var(--black-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: 3, gap: 2 }}>
                {(['grid', 'list'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12,
                      background: view === v ? 'var(--black-4)' : 'transparent',
                      color: view === v ? 'var(--text)' : 'var(--text-3)',
                      border: 'none', cursor: 'pointer',
                      boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                      transition: 'all 0.12s',
                    }}
                  >
                    {v === 'grid' ? '⊞' : '≡'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 10 }}>
              <div className="spin" style={{ width: 16, height: 16, border: '1.5px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%' }} />
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Loading</span>
            </div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 4 }}>
                {filter !== 'all' ? `No ${filter} documents` : 'No documents yet'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {filter !== 'all' ? 'Try a different filter' : 'Upload a document above to get started'}
              </p>
            </div>
          ) : (
            <>
              <div style={view === 'grid' ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 8,
              } : {
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <AnimatePresence mode="popLayout">
                  {documents.map((doc, i) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.025 }}
                    >
                      <DocumentCard
                        document={doc}
                        isSelected={selectedDoc?.id === doc.id}
                        processingInfo={processingDocs[doc.id]}
                        view={view}
                        onSelect={() => handleSelect(doc)}
                        onDelete={() => handleDelete(doc.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {total > 12 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, background: 'var(--black-2)', border: '1px solid var(--border)', color: page === 0 ? 'var(--text-3)' : 'var(--text-2)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontFamily: 'var(--font)' }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    {page + 1} / {Math.ceil(total / 12)}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * 12 >= total}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, background: 'var(--black-2)', border: '1px solid var(--border)', color: (page+1)*12 >= total ? 'var(--text-3)' : 'var(--text-2)', cursor: (page+1)*12 >= total ? 'default' : 'pointer', opacity: (page+1)*12 >= total ? 0.4 : 1, fontFamily: 'var(--font)' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedDoc && (
          <DocumentViewer
            document={selectedDoc}
            onClose={() => setSelectedDoc(null)}
            onDelete={() => handleDelete(selectedDoc.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}