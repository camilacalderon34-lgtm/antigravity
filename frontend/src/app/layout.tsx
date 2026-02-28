import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoVideo — AI Video Generator',
  description: 'Generate full videos from a prompt: script → voice → footage → edit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117] text-[#e6edf3]">{children}</body>
    </html>
  );
}
