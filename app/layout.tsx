import type { Metadata, Viewport } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.scss';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'GameFinder',
  description: 'A mobile-first gaming discovery app powered by RAWG.',
  manifest: '/manifest.json'
};

export const viewport: Viewport = {
  themeColor: '#111a2f'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body className={`${spaceGrotesk.variable} ${manrope.variable}`}>
        {children}
      </body>
    </html>
  );
}