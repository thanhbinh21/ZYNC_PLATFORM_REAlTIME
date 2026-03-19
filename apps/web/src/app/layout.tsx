import type { Metadata } from 'next';
import { Nunito, Poppins, Quicksand } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
});

const quicksand = Quicksand({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-quicksand',
});

const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Zync – Real-time Messaging',
  description: 'Modern real-time messaging platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${poppins.variable} ${quicksand.variable} ${nunito.variable}`}>{children}</body>
    </html>
  );
}
