import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pelvic Floor Coach',
  description: 'Your personal AI physio-coach.',
  manifest: '/manifest.json',
  icons: { apple: '/icon.png' },
  // These stop the user from pinching/zooming which breaks the layout
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pelvic Floor',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Forces content to go BEHIND the notch
  themeColor: '#4A2B36', // MATCHES THE DARK TOP GRADIENT
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
