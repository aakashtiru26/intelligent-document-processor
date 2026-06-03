'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tiff', '.tif'],
  'image/bmp': ['.bmp'],
  'image/webp': ['.webp'],
};

export default function UploadZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  const [hovering, setHovering] = useState(false);

  const onDrop = useCallback((files: File[]) => {
    if (files.length > 0) onUpload(files);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, accept: ACCEPTED, maxSize: 50 * 1024 * 1024, multiple: true,
  });

  const active = isDragActive && !isDragReject;

  return (
    <div
      {...getRootProps()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        cursor: 'pointer',
        border: `1px dashed ${isDragReject ? '#ef4444' : active ? 'rgba(0,200,150,0.5)' : hovering ? '#333' : 'var(--border)'}`,
        borderRadius: '10px',
        padding: '40px 32px',
        textAlign: 'center',
        background: active ? 'rgba(0,200,150,0.03)' : isDragReject ? 'rgba(239,68,68,0.03)' : 'transparent',
        transition: 'all 0.15s ease',
      }}
    >
      <input {...getInputProps()} />
      <p style={{
        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
        fontSize: 18, color: active ? 'var(--green)' : 'var(--text)',
        marginBottom: 6, transition: 'color 0.15s',
      }}>
        {isDragReject ? 'Unsupported file type' : active ? 'Release to upload' : 'Drop documents here'}
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
        or <span style={{ color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>browse</span>
        {' '}· PDF, PNG, JPG, TIFF · up to 50 MB · batch up to 10 files
      </p>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
        {['Invoice', 'Receipt', 'KYC Form', 'Bank Statement', 'Business Doc'].map(t => (
          <span key={t} className="tag" style={{ background: 'var(--black-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}