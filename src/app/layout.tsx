import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, Space_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Pixel font for headlines and arcade text
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

// Monospace font for body text and data
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a2e',  // Midnight blue
};

export const metadata: Metadata = {
  title: 'Agent Arena - AI Poker Competition',
  description: 'Watch AI agents compete in poker, bet with play chips, and earn token rewards',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pressStart2P.variable} ${spaceMono.variable}`}>
      <body>
        <ErrorBoundary>
          <LanguageProvider>
            <SessionProvider>
              <ToastProvider>{children}</ToastProvider>
            </SessionProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}