export type ContactRole = 'Buyer' | 'Seller' | 'Both';
export type PaymentTerms = 'Advance' | '50-50' | 'Credit 30 days' | 'LC';
export type ContactStatus = 'Active' | 'Cold' | 'Blacklisted';

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: ContactRole;
  commodity: string;
  city: string;
  state: string;
  phone: string;
  hasWhatsApp: boolean;
  lastQuotedPrice: string;
  quantity: string;
  paymentTerms: PaymentTerms;
  trustScore: number;
  notes: string;
  lastContacted: string;
  followUpDate: string;
  status: ContactStatus;
  createdAt: string;
}

export type DealStage =
  | 'Inquiry'
  | 'Negotiating'
  | 'Sample Sent'
  | 'PO Received'
  | 'In Transit'
  | 'Completed'
  | 'Cancelled';

export interface Deal {
  id: string;
  name: string;
  commodity: string;
  quantity: number;
  unit: string;
  sellerId: string;
  sellerPrice: number;
  buyerId: string;
  buyerPrice: number;
  stage: DealStage;
  expectedCloseDate: string;
  advanceReceived: boolean;
  advanceAmount: number;
  notes: string;
  createdAt: string;
}

export type PriceSource = 'IndiaMart' | 'Phone call' | 'Mandi' | 'Other';
export type PriceUnit = 'kg' | 'tonne' | 'quintal' | 'litre';

export interface PriceEntry {
  id: string;
  commodity: string;
  grade: string;
  price: number;
  unit: PriceUnit;
  source: PriceSource;
  contactName: string;
  city: string;
  region: string;
  dateRecorded: string;
  notes: string;
  createdAt: string;
}
