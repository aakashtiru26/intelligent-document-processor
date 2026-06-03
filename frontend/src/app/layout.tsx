import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'IDPS — Intelligent Document Processing System',
  description: 'AI-powered platform for OCR, NLP, and document intelligence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(16px)',
            color: '#0f0f23',
            border: '1.5px solid rgba(99,102,241,0.15)',
            borderRadius: '14px',
            fontFamily: 'Satoshi, sans-serif',
            fontSize: '13.5px',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(99,102,241,0.12)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
        }} />
      </body>
    </html>
  );
}
