import type { Metadata } from 'next';
import './globals.css';

const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Gift Insight — Smartkarma',
  description: 'Gift a Smartkarma insight to a colleague.',
  robots: { index: false, follow: false },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
    shortcut: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
