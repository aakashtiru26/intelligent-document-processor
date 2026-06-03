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
      const params: any = { skip: page * 12, limit: 12 };
      if (filter !== 'all') params.status = filter;
      const res = await documentsApi.list(params);
      setDocuments(res.data.documents);
      setTotal(res.data.total);
    } catch (e) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await documentsApi.stats();
      setStats(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchDocuments, fetchStats]);

  // Handle WebSocket updates
  useEffect(() => {
    if (!lastUpdate) return;

    if (lastUpdate.type === 'processing_update') {
      setProcessingDocs(prev => ({
        ...prev,
        [lastUpdate.document_id]: {
          progress: lastUpdate.progress || 0,
          message: lastUpdate.message || '',
          step: lastUpdate.step || '',
        },
      }));
    } else if (lastUpdate.type === 'processing_complete') {
      setProcessingDocs(prev => {
        const n = { ...prev };
        delete n[lastUpdate.document_id];
        return n;
      });
      toast.success('Document processed successfully!');
      fetchDocuments();
      fetchStats();
      // Update selected doc if it's the one that completed
      if (selectedDoc?.id === lastUpdate.document_id && lastUpdate.document) {
        setSelectedDoc(lastUpdate.document);
      }
    } else if (lastUpdate.type === 'processing_error') {
      setProcessingDocs(prev => {
        const n = { ...prev };
        delete n[lastUpdate.document_id];
        return n;
      });
      toast.error(`Processing failed: ${lastUpdate.error}`);
      fetchDocuments();
    }
  }, [lastUpdate, fetchDocuments, fetchStats, selectedDoc?.id]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const toastId = toast.loading(`Uploading ${files.length} file(s)...`);
    try {
      if (files.length === 1) {
        const res = await documentsApi.upload(files[0], clientId);
        const docId = res.data.document_id;
        setProcessingDocs(prev => ({
          ...prev,
          [docId]: { progress: 0, message: 'Queued for processing...', step: 'init' },
        }));
      } else {
        const res = await documentsApi.batchUpload(files, clientId);
        res.data.documents.forEach((d: any) => {
          setProcessingDocs(prev => ({
            ...prev,
            [d.document_id]: { progress: 0, message: 'Queued...', step: 'init' },
          }));
        });
      }
      toast.success('Upload successful! Processing...', { id: toastId });
      await fetchDocuments();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Upload failed', { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentsApi.delete(id);
      toast.success('Document deleted');
      if (selectedDoc?.id === id) setSelectedDoc(null);
      fetchDocuments();
      fetchStats();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleSelect = async (doc: Document) => {
    if (doc.status === 'completed') {
      // Refresh to get latest data
      try {
        const res = await documentsApi.get(doc.id);
        setSelectedDoc(res.data);
      } catch {
        setSelectedDoc(doc);
      }
    } else {
      setSelectedDoc(doc);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6060a0, transparent)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      <Header connected={connected} />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatsBar stats={stats} />
        </motion.div>

        {/* Upload Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-8">
          <UploadZone onUpload={handleUpload} />
        </motion.div>

        {/* Active Processing */}
        <AnimatePresence>
          {Object.keys(processingDocs).length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="mt-6">
              <div className="grid gap-3">
                {Object.entries(processingDocs).map(([docId, info]) => (
                  <ProcessingOverlay key={docId} docId={docId} {...info} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Documents Section */}
        <div className="mt-10">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                Document History
              </h2>
              <span className="text-sm px-2 py-0.5 rounded-full" style={{
                background: 'rgba(96,96,160,0.15)', color: 'var(--text-secondary)',
                border: '1px solid rgba(96,96,160,0.2)'
              }}>
                {total} total
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Filters */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {['all', 'completed', 'processing', 'failed'].map(f => (
                  <button key={f} onClick={() => { setFilter(f); setPage(0); }}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all capitalize"
                    style={{
                      background: filter === f ? 'rgba(245,158,11,0.15)' : 'transparent',
                      color: filter === f ? 'var(--accent)' : 'var(--text-secondary)',
                      border: filter === f ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
              {/* View toggle */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {(['grid', 'list'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className="px-3 py-1 rounded-md text-xs transition-all"
                    style={{
                      background: view === v ? 'rgba(245,158,11,0.15)' : 'transparent',
                      color: view === v ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    {v === 'grid' ? '⊞ Grid' : '☰ List'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(245,158,11,0.5)', borderTopColor: 'transparent' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading documents...</p>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="text-6xl opacity-20">📄</div>
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>No documents yet</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload your first document above to get started</p>
            </div>
          ) : (
            <>
              <div className={view === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-3'}>
                <AnimatePresence mode="popLayout">
                  {documents.map((doc, i) => (
                    <motion.div key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.04 }}>
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

              {/* Pagination */}
              {total > 12 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    ← Prev
                  </button>
                  <span className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Page {page + 1} of {Math.ceil(total / 12)}
                  </span>
                  <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 12 >= total}
                    className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Document Detail Panel */}
      <AnimatePresence>
        {selectedDoc && (
          <DocumentViewer
            document={selectedDoc}
            onClose={() => setSelectedDoc(null)}
            onDelete={() => { handleDelete(selectedDoc.id); setSelectedDoc(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
