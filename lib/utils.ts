import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export function isDueThisWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400000);
  return d >= now && d <= week;
}

export function calcGrossMargin(buyerPrice: number, sellerPrice: number, quantity: number): number {
  return (buyerPrice - sellerPrice) * quantity;
}

export function calcMarginPct(buyerPrice: number, sellerPrice: number): number {
  if (buyerPrice === 0) return 0;
  return ((buyerPrice - sellerPrice) / buyerPrice) * 100;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function exportContactsToCSV(contacts: import('@/types').Contact[]): void {
  const headers = [
    'Name', 'Company', 'Role', 'Commodity', 'City', 'State', 'Phone',
    'WhatsApp', 'Last Quoted Price', 'Quantity', 'Payment Terms',
    'Trust Score', 'Status', 'Last Contacted', 'Follow-up Date', 'Notes',
  ];
  const rows = contacts.map(c => [
    c.name, c.company, c.role, c.commodity, c.city, c.state, c.phone,
    c.hasWhatsApp ? 'Yes' : 'No', c.lastQuotedPrice, c.quantity,
    c.paymentTerms, c.trustScore, c.status, c.lastContacted,
    c.followUpDate, `"${c.notes.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
