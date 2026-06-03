import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'IDPS — Document Intelligence',
  description: 'Intelligent Document Processing System',
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
              background: '#161616',
              color: '#f5f5f5',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontFamily: "'Inter', sans-serif",
              padding: '10px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            },
            success: { iconTheme: { primary: '#00c896', secondary: '#000' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}