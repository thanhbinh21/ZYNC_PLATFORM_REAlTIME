import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/shared/Toast';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Zync – Real-time Messaging',
  description: 'Modern real-time messaging platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
