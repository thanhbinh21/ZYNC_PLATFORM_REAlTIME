import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'Zync – Real-time Messaging',
  description: 'Modern real-time messaging platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={sora.variable}>{children}</body>
    </html>
  );
}
