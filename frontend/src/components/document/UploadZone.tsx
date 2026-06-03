'use client';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  uploading?: boolean;
}

export default function UploadZone({ onUpload, uploading }: UploadZoneProps) {
  const onDrop = useCallback((files: File[]) => { if (files.length > 0) onUpload(files); }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg','.jpeg'], 'image/tiff': ['.tiff'], 'image/bmp': ['.bmp'], 'image/webp': ['.webp'] },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
    disabled: uploading,
  });

  const icon = isDragReject ? '🚫' : isDragActive ? '📥' : uploading ? '⏳' : '📄';
  const title = isDragReject ? 'Unsupported file type' : isDragActive ? 'Release to process' : uploading ? 'Uploading...' : 'Drop documents here';
  const sub = isDragReject ? 'Use PDF, PNG, JPG, TIFF, BMP or WEBP' : isDragActive ? 'We\'ll extract all the intelligence from it' : 'or click to browse · up to 50MB · batch up to 10 files';

  return (
    <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'dragging' : ''} ${isDragReject ? 'rejected' : ''}`}>
      <input {...getInputProps()} />
      <motion.div className="upload-icon-wrap" animate={isDragActive ? { scale: 1.15, rotate: 8 } : uploading ? { rotate: [0, 360] } : { scale: 1, rotate: 0 }}
        transition={uploading ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}>
        {icon}
      </motion.div>
      <div className="upload-title">{title}</div>
      <div className="upload-sub">{sub}</div>
      <div className="upload-types">
        {['Invoice','Receipt','KYC Form','Bank Statement','Business Doc','Scanned PDF'].map(t => (
          <span key={t} className="type-chip">{t}</span>
        ))}
      </div>
    </div>
  );
}
