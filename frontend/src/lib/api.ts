import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120000,
});

// Types
export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  page_count: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  document_type: string | null;
  processing_time: number | null;
  raw_text: string | null;
  structured_data: Record<string, any> | null;
  entities: Record<string, string[]> | null;
  keywords: Array<{ word: string; count: number; score: number }> | null;
  summary: string | null;
  confidence_score: number | null;
  field_confidences: Record<string, number> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  total: number;
  skip: number;
  limit: number;
  documents: Document[];
}

export interface StatsResponse {
  total_documents: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
  avg_confidence: number;
  avg_processing_time: number;
}

export const documentsApi = {
  upload: (file: File, clientId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (clientId) formData.append('client_id', clientId);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  batchUpload: (files: File[], clientId?: string) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (clientId) formData.append('client_id', clientId);
    return api.post('/documents/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (params?: { skip?: number; limit?: number; status?: string; doc_type?: string }) =>
    api.get<DocumentListResponse>('/documents/', { params }),

  get: (id: string) => api.get<Document>(`/documents/${id}`),

  delete: (id: string) => api.delete(`/documents/${id}`),

  stats: () => api.get<StatsResponse>('/documents/stats/overview'),

  exportJson: (id: string) => `${API_URL}/api/export/${id}/json`,
  exportCsv: (id: string) => `${API_URL}/api/export/${id}/csv`,
};
