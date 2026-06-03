'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tiff', '.tif'],
  'image/bmp': ['.bmp'],
  'image/webp': ['.webp'],
};

export default function UploadZone({ onUpload }: UploadZoneProps) {
  const [queued, setQueued] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className="relative overflow-hidden cursor-pointer rounded-2xl transition-all duration-300"
        style={{
          border: `2px dashed ${isDragReject ? 'var(--error)' : isDragActive ? 'var(--accent)' : 'rgba(96,96,160,0.3)'}`,
          background: isDragActive
            ? 'rgba(245,158,11,0.05)'
            : 'rgba(14,14,30,0.6)',
          padding: '40px 24px',
        }}>
        <input {...getInputProps()} />

        {/* Scan animation when dragging */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '500%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-x-0 h-px scan-line pointer-events-none"
              style={{ height: '40px', top: 0 }}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col items-center gap-4 text-center relative z-10">
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: isDragActive ? 'rgba(245,158,11,0.15)' : 'rgba(96,96,160,0.1)',
              border: `1px solid ${isDragActive ? 'rgba(245,158,11,0.4)' : 'rgba(96,96,160,0.2)'}`,
            }}>
            {isDragReject ? '🚫' : isDragActive ? '📥' : '📄'}
          </motion.div>

          <div>
            <p className="text-base font-medium mb-1" style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-primary)' }}>
              {isDragReject
                ? 'File type not supported'
                : isDragActive
                ? 'Drop to process document'
                : 'Drop documents here or click to upload'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              PDF, PNG, JPG, TIFF, BMP, WEBP — up to 50MB each — batch up to 10 files
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {['Invoice', 'Receipt', 'KYC Form', 'Bank Statement', 'Business Doc'].map(type => (
              <span key={type} className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(96,96,160,0.1)', color: 'var(--text-secondary)', border: '1px solid rgba(96,96,160,0.15)' }}>
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
