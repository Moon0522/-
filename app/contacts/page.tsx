'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Search, Download, AlertTriangle, Star, Phone, MessageCircle,
  Pencil, Trash2, ChevronUp, ChevronDown, X, Clock,
} from 'lucide-react';
import { loadContacts, saveContacts } from '@/lib/storage';
import type { Contact, ContactRole, ContactStatus, PaymentTerms } from '@/types';
import { generateId, formatDate, isOverdue, exportContactsToCSV } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const ROLES: ContactRole[] = ['Buyer', 'Seller', 'Both'];
const STATUSES: ContactStatus[] = ['Active', 'Cold', 'Blacklisted'];
const PAYMENT_TERMS: PaymentTerms[] = ['Advance', '50-50', 'Credit 30 days', 'LC'];

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          className={`text-lg leading-none ${i <= value ? 'text-[#F5A623]' : 'text-[#333]'} ${onChange ? 'hover:text-[#F5A623] cursor-pointer' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const EMPTY: Omit<Contact, 'id' | 'createdAt'> = {
  name: '', company: '', role: 'Buyer', commodity: '', city: '', state: '',
  phone: '', hasWhatsApp: false, lastQuotedPrice: '', quantity: '',
  paymentTerms: 'Advance', trustScore: 3, notes: '',
  lastContacted: new Date().toISOString().split('T')[0],
  followUpDate: '', status: 'Active',
};

type SortKey = 'lastContacted' | 'followUpDate' | 'trustScore' | 'name';

function statusBadge(s: ContactStatus) {
  if (s === 'Active') return <Badge variant="green">Active</Badge>;
  if (s === 'Cold') return <Badge variant="amber">Cold</Badge>;
  return <Badge variant="red">Blacklisted</Badge>;
}

function roleBadge(r: ContactRole) {
  if (r === 'Buyer') return <Badge variant="blue">Buyer</Badge>;
  if (r === 'Seller') return <Badge variant="default">Seller</Badge>;
  return <Badge variant="ghost">Both</Badge>;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterCity, setFilterCity] = useState<string>('All');
  const [filterCommodity, setFilterCommodity] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('lastContacted');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<Omit<Contact, 'id' | 'createdAt'>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setContacts(loadContacts());
  }, []);

  const persist = (updated: Contact[]) => {
    setContacts(updated);
    saveContacts(updated);
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c: Contact) => {
    setEditing(c);
    const { id, createdAt, ...rest } = c;
    setForm(rest);
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      persist(contacts.map(c => c.id === editing.id ? { ...editing, ...form } : c));
    } else {
      persist([...contacts, { id: generateId(), createdAt: new Date().toISOString(), ...form }]);
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    persist(contacts.filter(c => c.id !== id));
    setDeleteId(null);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const cities = useMemo(() => ['All', ...Array.from(new Set(contacts.map(c => c.city).filter(Boolean)))], [contacts]);
  const commodities = useMemo(() => ['All', ...Array.from(new Set(contacts.map(c => c.commodity).filter(Boolean)))], [contacts]);

  const overdueContacts = contacts.filter(c => c.status !== 'Blacklisted' && isOverdue(c.followUpDate));

  const filtered = useMemo(() => {
    let list = contacts.filter(c => {
      const q = search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.company.toLowerCase().includes(q)) return false;
      if (filterRole !== 'All' && c.role !== filterRole) return false;
      if (filterStatus !== 'All' && c.status !== filterStatus) return false;
      if (filterCity !== 'All' && c.city !== filterCity) return false;
      if (filterCommodity !== 'All' && c.commodity !== filterCommodity) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let av: string | number = a[sortKey] ?? '';
      let bv: string | number = b[sortKey] ?? '';
      if (sortKey === 'trustScore') { av = a.trustScore; bv = b.trustScore; }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [contacts, search, filterRole, filterStatus, filterCity, filterCommodity, sortKey, sortDir]);

  if (!mounted) return null;

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-3">
      {/* Overdue banner */}
      {overdueContacts.length > 0 && (
        <div className="border border-[#F5A623]/40 bg-[#F5A623]/5 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
          <span className="font-mono text-xs text-[#F5A623] font-medium">
            FOLLOW-UP OVERDUE:
          </span>
          <span className="font-mono text-xs text-[#F5A623]/80">
            {overdueContacts.map(c => c.name).join(', ')}
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-mono text-xs font-bold tracking-widest text-white uppercase mr-2">
          Contacts <span className="text-[#555]">({filtered.length})</span>
        </h1>
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555]" />
          <Input
            placeholder="Search name or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-7 h-8 font-mono text-xs bg-[#111] border-[#222] text-white placeholder:text-[#444]"
          />
        </div>

        {/* Filters */}
        {[
          { label: 'Role', value: filterRole, set: setFilterRole, opts: ['All', ...ROLES] },
          { label: 'Status', value: filterStatus, set: setFilterStatus, opts: ['All', ...STATUSES] },
          { label: 'City', value: filterCity, set: setFilterCity, opts: cities },
          { label: 'Commodity', value: filterCommodity, set: setFilterCommodity, opts: commodities },
        ].map(f => (
          <select
            key={f.label}
            value={f.value}
            onChange={e => f.set(e.target.value)}
            className="h-8 px-2 font-mono text-[10px] bg-[#111] border border-[#222] text-[#888] tracking-wider"
          >
            {f.opts.map(o => <option key={o} value={o}>{f.label === 'All' ? f.label : o}</option>)}
          </select>
        ))}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportContactsToCSV(filtered)}
            className="h-8 px-3 font-mono text-[10px] tracking-wider border border-[#222] text-[#555] hover:text-[#888] hover:border-[#333] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
          <button
            onClick={openAdd}
            className="h-8 px-3 font-mono text-[10px] tracking-wider bg-[#00D26A] text-black font-bold flex items-center gap-1.5 hover:bg-[#00b85e] transition-colors"
          >
            <Plus className="w-3 h-3" /> ADD CONTACT
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#222] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#222] bg-[#0d0d0d]">
              {([
                { key: 'name', label: 'Name / Company' },
                { key: null, label: 'Role' },
                { key: null, label: 'Commodity' },
                { key: null, label: 'City' },
                { key: null, label: 'Phone' },
                { key: null, label: 'Last Price' },
                { key: null, label: 'Payment' },
                { key: 'trustScore', label: 'Trust' },
                { key: null, label: 'Status' },
                { key: 'lastContacted', label: 'Last Contact' },
                { key: 'followUpDate', label: 'Follow-up' },
                { key: null, label: '' },
              ] as { key: SortKey | null; label: string }[]).map(col => (
                <th
                  key={col.label}
                  onClick={() => col.key && toggleSort(col.key)}
                  className={`px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-[#888]' : ''}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.key && sortKey === col.key && (
                      sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center font-mono text-xs text-[#333]">
                  No contacts found
                </td>
              </tr>
            )}
            {filtered.map(c => {
              const overdue = isOverdue(c.followUpDate);
              return (
                <tr
                  key={c.id}
                  className={`border-b border-[#1a1a1a] hover:bg-[#111] transition-colors ${c.status === 'Blacklisted' ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-xs text-white font-medium">{c.name}</div>
                    <div className="font-mono text-[10px] text-[#555]">{c.company}</div>
                  </td>
                  <td className="px-3 py-2.5">{roleBadge(c.role)}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[#888]">{c.commodity}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[#666]">{c.city}, {c.state}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <a href={`tel:${c.phone}`} className="font-mono text-[10px] text-[#888] hover:text-white">
                        <Phone className="w-3 h-3 inline mr-1" />{c.phone}
                      </a>
                      {c.hasWhatsApp && (
                        <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="w-3 h-3 text-[#00D26A]" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[#00D26A]">{c.lastQuotedPrice}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[#666]">{c.paymentTerms}</td>
                  <td className="px-3 py-2.5">
                    <Stars value={c.trustScore} />
                  </td>
                  <td className="px-3 py-2.5">{statusBadge(c.status)}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[#555]">{formatDate(c.lastContacted)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono text-[10px] flex items-center gap-1 ${overdue ? 'text-[#F5A623]' : 'text-[#555]'}`}>
                      {overdue && <Clock className="w-3 h-3" />}
                      {c.followUpDate ? formatDate(c.followUpDate) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-[#555] hover:text-[#888]">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="text-[#555] hover:text-[#FF4444]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Contact' : 'New Contact'}</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 grid grid-cols-2 gap-3">
            <Field label="Name *">
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Company">
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Role">
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as ContactRole }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Commodity">
              <Input value={form.commodity} onChange={e => setForm(f => ({ ...f, commodity: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" placeholder="e.g. Copper Scrap" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="WhatsApp">
              <div className="flex items-center gap-2 h-8">
                <Switch checked={form.hasWhatsApp} onCheckedChange={v => setForm(f => ({ ...f, hasWhatsApp: v }))} />
                <span className="font-mono text-[10px] text-[#666]">{form.hasWhatsApp ? 'Yes' : 'No'}</span>
              </div>
            </Field>
            <Field label="Last Quoted Price">
              <Input value={form.lastQuotedPrice} onChange={e => setForm(f => ({ ...f, lastQuotedPrice: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" placeholder="e.g. ₹450/kg" />
            </Field>
            <Field label="Quantity">
              <Input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" placeholder="e.g. 5-10 tonnes/month" />
            </Field>
            <Field label="Payment Terms">
              <select value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value as PaymentTerms }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                {PAYMENT_TERMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ContactStatus }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Last Contacted">
              <Input type="date" value={form.lastContacted} onChange={e => setForm(f => ({ ...f, lastContacted: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Follow-up Date">
              <Input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Trust Score" className="col-span-2">
              <Stars value={form.trustScore} onChange={v => setForm(f => ({ ...f, trustScore: v }))} />
            </Field>
            <Field label="Notes" className="col-span-2">
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="font-mono text-xs bg-[#1a1a1a] border-[#333] text-white resize-none" />
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)}
              className="h-8 px-4 font-mono text-[10px] tracking-wider border border-[#333] text-[#666] hover:text-[#888]">
              CANCEL
            </button>
            <button onClick={handleSave}
              className="h-8 px-4 font-mono text-[10px] tracking-wider bg-[#00D26A] text-black font-bold hover:bg-[#00b85e]">
              {editing ? 'SAVE CHANGES' : 'ADD CONTACT'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 font-mono text-xs text-[#888]">
            This will permanently delete the contact. This cannot be undone.
          </div>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)}
              className="h-8 px-4 font-mono text-[10px] border border-[#333] text-[#666] hover:text-[#888]">
              CANCEL
            </button>
            <button onClick={() => deleteId && handleDelete(deleteId)}
              className="h-8 px-4 font-mono text-[10px] bg-[#FF4444] text-white font-bold hover:bg-[#cc3333]">
              DELETE
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="font-mono text-[10px] text-[#555] tracking-wider uppercase mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
