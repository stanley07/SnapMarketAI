import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'SnapMarket AI — Snap It. Find It. Sell It.',
  description:
    'Visual commerce platform powered by Meta AI. Find products by snapping a photo, or transform raw shelf photos into professional marketplace listings in seconds.',
  keywords: ['visual search', 'meta ai', 'commerce', 'marketplace', 'ai image editing', 'multimodal'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-screen bg-[#faf9f6] text-slate-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
