import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'IDPS — Intelligent Document Processing System',
  description: 'Production-ready AI-powered document intelligence platform',
  keywords: ['OCR', 'NLP', 'document processing', 'invoice', 'KYC', 'AI'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#14142e',
              color: '#e8e8f0',
              border: '1px solid rgba(96,96,160,0.3)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#0a0a1a' },
            },
            error: {
              iconTheme: { primary: '#f43f5e', secondary: '#0a0a1a' },
            },
          }}
        />
      </body>
    </html>
  );
}
