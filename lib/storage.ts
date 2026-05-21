import type { Contact, Deal, PriceEntry } from '@/types';

const CONTACTS_KEY = 'tradedesk_contacts';
const DEALS_KEY = 'tradedesk_deals';
const PRICES_KEY = 'tradedesk_prices';
const SEEDED_KEY = 'tradedesk_seeded';

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadContacts(): Contact[] {
  return load<Contact>(CONTACTS_KEY);
}
export function saveContacts(contacts: Contact[]): void {
  save(CONTACTS_KEY, contacts);
}

export function loadDeals(): Deal[] {
  return load<Deal>(DEALS_KEY);
}
export function saveDeals(deals: Deal[]): void {
  save(DEALS_KEY, deals);
}

export function loadPrices(): PriceEntry[] {
  return load<PriceEntry>(PRICES_KEY);
}
export function savePrices(prices: PriceEntry[]): void {
  save(PRICES_KEY, prices);
}

export function isSeeded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SEEDED_KEY) === 'true';
}

export function markSeeded(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEEDED_KEY, 'true');
}
