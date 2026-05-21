import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';

export const metadata: Metadata = {
  title: 'TradeDesk — Commodity Trading Operations',
  description: 'Commodity trading operations dashboard for contacts, deals, and price intelligence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] antialiased">
        <Navbar />
        <main className="pt-12">{children}</main>
      </body>
    </html>
  );
}
