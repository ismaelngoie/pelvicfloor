import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pelvic Floor Coach',
  description: 'Your personal AI physio-coach.',
  manifest: '/manifest.json',
  icons: { apple: '/icon.png' },
};

// THIS IS THE FIX FOR THE WHITE BAR:
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // "cover" tells iOS to extend the background color under the status bar (battery/wifi)
  viewportFit: 'cover',
  themeColor: '#FCE7EB', // Matches your top gradient color
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
