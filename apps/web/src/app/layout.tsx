import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zync – Real-time Messaging',
  description: 'Modern real-time messaging platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
