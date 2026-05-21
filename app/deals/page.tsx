'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Plus, ChevronUp, ChevronDown, CheckCircle2, XCircle,
  Pencil, Trash2, X, IndianRupee, Calendar, ArrowRight,
} from 'lucide-react';
import { loadDeals, saveDeals, loadContacts } from '@/lib/storage';
import type { Deal, DealStage, Contact } from '@/types';
import { generateId, formatDate, formatCurrency, calcGrossMargin, calcMarginPct, isDueThisWeek } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const ACTIVE_STAGES: DealStage[] = ['Inquiry', 'Negotiating', 'Sample Sent', 'PO Received', 'In Transit'];
const ALL_STAGES: DealStage[] = [...ACTIVE_STAGES, 'Completed', 'Cancelled'];

const STAGE_COLORS: Record<DealStage, string> = {
  Inquiry: '#555',
  Negotiating: '#F5A623',
  'Sample Sent': '#888',
  'PO Received': '#4FC3F7',
  'In Transit': '#AB47BC',
  Completed: '#00D26A',
  Cancelled: '#FF4444',
};

const UNITS = ['kg', 'tonnes', 'quintal', 'MT', 'litres'];

function stageBadge(s: DealStage) {
  const color = STAGE_COLORS[s];
  return (
    <span className="inline-flex items-center font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 border"
      style={{ color, borderColor: color + '44', background: color + '11' }}>
      {s}
    </span>
  );
}

const EMPTY_DEAL: Omit<Deal, 'id' | 'createdAt'> = {
  name: '', commodity: '', quantity: 0, unit: 'tonnes',
  sellerId: '', sellerPrice: 0, buyerId: '', buyerPrice: 0,
  stage: 'Inquiry', expectedCloseDate: '',
  advanceReceived: false, advanceAmount: 0, notes: '',
};

type SortKey = 'createdAt' | 'expectedCloseDate' | 'margin' | 'stage';

function DealCard({ deal, contacts, onEdit, onDelete, onStage }: {
  deal: Deal; contacts: Contact[];
  onEdit: () => void; onDelete: () => void;
  onStage: (s: DealStage) => void;
}) {
  const seller = contacts.find(c => c.id === deal.sellerId);
  const buyer = contacts.find(c => c.id === deal.buyerId);
  const margin = calcGrossMargin(deal.buyerPrice, deal.sellerPrice, deal.quantity);
  const marginPct = calcMarginPct(deal.buyerPrice, deal.sellerPrice);
  const dueSoon = isDueThisWeek(deal.expectedCloseDate);

  return (
    <div className="bg-[#0d0d0d] border border-[#222] p-3 space-y-2 hover:border-[#333] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-white font-medium leading-tight">{deal.name}</div>
          <div className="font-mono text-[10px] text-[#555] mt-0.5">{deal.commodity}</div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onEdit} className="text-[#444] hover:text-[#888]">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="text-[#444] hover:text-[#FF4444]">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono text-[10px]">
        <span className="text-[#555]">{deal.quantity} {deal.unit}</span>
        <span className="text-[#333]">·</span>
        <span className={margin >= 0 ? 'text-[#00D26A]' : 'text-[#FF4444]'}>
          {formatCurrency(margin)} ({marginPct.toFixed(1)}%)
        </span>
      </div>

      <div className="flex items-center justify-between font-mono text-[10px]">
        <div className="space-y-0.5">
          <div className="text-[#555]">S: <span className="text-[#888]">{seller?.name ?? '—'}</span> @ ₹{deal.sellerPrice.toLocaleString()}</div>
          <div className="text-[#555]">B: <span className="text-[#888]">{buyer?.name ?? '—'}</span> @ ₹{deal.buyerPrice.toLocaleString()}</div>
        </div>
      </div>

      {deal.expectedCloseDate && (
        <div className={`font-mono text-[10px] flex items-center gap-1 ${dueSoon ? 'text-[#F5A623]' : 'text-[#444]'}`}>
          <Calendar className="w-3 h-3" />
          {formatDate(deal.expectedCloseDate)}
          {dueSoon && <span className="text-[#F5A623]">· DUE SOON</span>}
        </div>
      )}

      {deal.notes && (
        <div className="font-mono text-[10px] text-[#444] border-t border-[#1a1a1a] pt-1.5 line-clamp-2">{deal.notes}</div>
      )}

      {/* Quick action buttons */}
      {!['Completed', 'Cancelled'].includes(deal.stage) && (
        <div className="flex gap-1.5 pt-1 border-t border-[#1a1a1a]">
          <button
            onClick={() => onStage('Completed')}
            className="flex-1 h-6 font-mono text-[9px] tracking-wider border border-[#00D26A]/30 text-[#00D26A] hover:bg-[#00D26A]/10 flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" /> DONE
          </button>
          <button
            onClick={() => onStage('Cancelled')}
            className="flex-1 h-6 font-mono text-[9px] tracking-wider border border-[#FF4444]/30 text-[#FF4444] hover:bg-[#FF4444]/10 flex items-center justify-center gap-1"
          >
            <XCircle className="w-3 h-3" /> CANCEL
          </button>
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<Omit<Deal, 'id' | 'createdAt'>>(EMPTY_DEAL);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDeals(loadDeals());
    setContacts(loadContacts());
  }, []);

  const persist = (updated: Deal[]) => { setDeals(updated); saveDeals(updated); };

  const openAdd = () => { setEditing(null); setForm(EMPTY_DEAL); setOpen(true); };
  const openEdit = (d: Deal) => {
    setEditing(d);
    const { id, createdAt, ...rest } = d;
    setForm(rest);
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      persist(deals.map(d => d.id === editing.id ? { ...editing, ...form } : d));
    } else {
      persist([...deals, { id: generateId(), createdAt: new Date().toISOString(), ...form }]);
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => { persist(deals.filter(d => d.id !== id)); setDeleteId(null); };
  const updateStage = (id: string, stage: DealStage) => persist(deals.map(d => d.id === id ? { ...d, stage } : d));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const activeDeals = deals.filter(d => !['Completed', 'Cancelled'].includes(d.stage));
  const closedDeals = deals.filter(d => ['Completed', 'Cancelled'].includes(d.stage));

  const pipelineValue = activeDeals.reduce((s, d) => s + d.buyerPrice * d.quantity, 0);
  const pipelineMargin = activeDeals.reduce((s, d) => s + calcGrossMargin(d.buyerPrice, d.sellerPrice, d.quantity), 0);
  const closingThisWeek = activeDeals.filter(d => isDueThisWeek(d.expectedCloseDate)).length;
  const totalProfit = closedDeals.filter(d => d.stage === 'Completed').reduce((s, d) => s + calcGrossMargin(d.buyerPrice, d.sellerPrice, d.quantity), 0);

  const sortedDeals = (list: Deal[]) => [...list].sort((a, b) => {
    let av: string | number, bv: string | number;
    if (sortKey === 'margin') {
      av = calcGrossMargin(a.buyerPrice, a.sellerPrice, a.quantity);
      bv = calcGrossMargin(b.buyerPrice, b.sellerPrice, b.quantity);
    } else {
      av = a[sortKey] ?? '';
      bv = b[sortKey] ?? '';
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (!mounted) return null;

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase ${sortKey === k ? 'text-[#00D26A]' : 'text-[#555] hover:text-[#888]'}`}>
      {label}
      {sortKey === k ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
    </button>
  );

  return (
    <div className="p-4 max-w-[1600px] mx-auto space-y-3">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Pipeline Value', value: formatCurrency(pipelineValue), color: '#00D26A' },
          { label: 'Expected Margin', value: formatCurrency(pipelineMargin), color: '#00D26A' },
          { label: 'Closing This Week', value: closingThisWeek.toString(), color: closingThisWeek > 0 ? '#F5A623' : '#555' },
          { label: 'Total Profit Earned', value: formatCurrency(totalProfit), color: totalProfit >= 0 ? '#00D26A' : '#FF4444' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111] border border-[#222] px-4 py-3">
            <div className="font-mono text-[10px] text-[#555] tracking-wider uppercase mb-1">{kpi.label}</div>
            <div className="font-mono text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="font-mono text-xs font-bold tracking-widest text-white uppercase mr-2">
          Deals <span className="text-[#555]">({deals.length})</span>
        </h1>
        <Tabs value={tab} onValueChange={v => setTab(v as 'active' | 'closed')}>
          <TabsList className="h-8">
            <TabsTrigger value="active" className="text-[10px] px-3 py-1.5">Active ({activeDeals.length})</TabsTrigger>
            <TabsTrigger value="closed" className="text-[10px] px-3 py-1.5">Closed ({closedDeals.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 border border-[#222] h-8">
          {(['kanban', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 h-full font-mono text-[10px] tracking-wider uppercase transition-colors ${view === v ? 'bg-[#222] text-white' : 'text-[#555] hover:text-[#888]'}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <button onClick={openAdd}
            className="h-8 px-3 font-mono text-[10px] tracking-wider bg-[#00D26A] text-black font-bold flex items-center gap-1.5 hover:bg-[#00b85e]">
            <Plus className="w-3 h-3" /> NEW DEAL
          </button>
        </div>
      </div>

      {/* Active deals */}
      {tab === 'active' && (
        <>
          {view === 'kanban' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 overflow-x-auto">
              {ACTIVE_STAGES.map(stage => {
                const stageDeals = activeDeals.filter(d => d.stage === stage);
                const stageValue = stageDeals.reduce((s, d) => s + d.buyerPrice * d.quantity, 0);
                return (
                  <div key={stage} className="space-y-2 min-w-[200px]">
                    <div className="bg-[#111] border border-[#222] px-3 py-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: STAGE_COLORS[stage] }}>
                        {stage}
                      </span>
                      <span className="font-mono text-[10px] text-[#444]">{stageDeals.length}</span>
                    </div>
                    {stageDeals.length > 0 && (
                      <div className="font-mono text-[10px] text-[#555] px-1">{formatCurrency(stageValue)}</div>
                    )}
                    <div className="space-y-2">
                      {stageDeals.map(d => (
                        <DealCard
                          key={d.id}
                          deal={d}
                          contacts={contacts}
                          onEdit={() => openEdit(d)}
                          onDelete={() => setDeleteId(d.id)}
                          onStage={stage => updateStage(d.id, stage)}
                        />
                      ))}
                    </div>
                    {/* Drop hint */}
                    {stageDeals.length === 0 && (
                      <div className="border border-dashed border-[#1a1a1a] h-16 flex items-center justify-center">
                        <span className="font-mono text-[10px] text-[#2a2a2a]">EMPTY</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {view === 'list' && (
            <DealTable deals={sortedDeals(activeDeals)} contacts={contacts} sortKey={sortKey} sortDir={sortDir}
              onEdit={openEdit} onDelete={id => setDeleteId(id)} onStage={updateStage} SortBtn={SortBtn} />
          )}
        </>
      )}

      {/* Closed deals */}
      {tab === 'closed' && (
        <div className="space-y-3">
          <div className="bg-[#111] border border-[#222] p-3 flex items-center gap-4">
            <div>
              <div className="font-mono text-[10px] text-[#555] tracking-wider uppercase mb-1">Total Profit (Completed)</div>
              <div className="font-mono text-xl font-bold text-[#00D26A]">{formatCurrency(totalProfit)}</div>
            </div>
            <div className="h-8 w-px bg-[#222]" />
            <div>
              <div className="font-mono text-[10px] text-[#555] tracking-wider uppercase mb-1">Deals Completed</div>
              <div className="font-mono text-xl font-bold text-white">
                {closedDeals.filter(d => d.stage === 'Completed').length}
              </div>
            </div>
            <div className="h-8 w-px bg-[#222]" />
            <div>
              <div className="font-mono text-[10px] text-[#555] tracking-wider uppercase mb-1">Cancelled</div>
              <div className="font-mono text-xl font-bold text-[#FF4444]">
                {closedDeals.filter(d => d.stage === 'Cancelled').length}
              </div>
            </div>
          </div>
          <DealTable deals={sortedDeals(closedDeals)} contacts={contacts} sortKey={sortKey} sortDir={sortDir}
            onEdit={openEdit} onDelete={id => setDeleteId(id)} onStage={updateStage} SortBtn={SortBtn} />
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Deal' : 'New Deal'}</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 grid grid-cols-2 gap-3">
            <Field label="Deal Name *" className="col-span-2">
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white"
                placeholder="e.g. Copper Scrap — Delhi to Pune" />
            </Field>
            <Field label="Commodity">
              <Input value={form.commodity} onChange={e => setForm(f => ({ ...f, commodity: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Stage">
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                {ALL_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Quantity">
              <Input type="number" value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Unit">
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Seller">
              <select value={form.sellerId} onChange={e => setForm(f => ({ ...f, sellerId: e.target.value }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                <option value="">— Select seller —</option>
                {contacts.filter(c => c.role !== 'Buyer').map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                ))}
              </select>
            </Field>
            <Field label="Seller Price (₹/unit)">
              <Input type="number" value={form.sellerPrice || ''} onChange={e => setForm(f => ({ ...f, sellerPrice: Number(e.target.value) }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Buyer">
              <select value={form.buyerId} onChange={e => setForm(f => ({ ...f, buyerId: e.target.value }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                <option value="">— Select buyer —</option>
                {contacts.filter(c => c.role !== 'Seller').map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                ))}
              </select>
            </Field>
            <Field label="Buyer Price (₹/unit)">
              <Input type="number" value={form.buyerPrice || ''} onChange={e => setForm(f => ({ ...f, buyerPrice: Number(e.target.value) }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>

            {/* Margin preview */}
            {form.quantity > 0 && form.buyerPrice > 0 && (
              <div className="col-span-2 bg-[#0d0d0d] border border-[#222] p-3 font-mono text-xs">
                <span className="text-[#555]">Gross Margin: </span>
                <span className={calcGrossMargin(form.buyerPrice, form.sellerPrice, form.quantity) >= 0 ? 'text-[#00D26A]' : 'text-[#FF4444]'}>
                  {formatCurrency(calcGrossMargin(form.buyerPrice, form.sellerPrice, form.quantity))}
                </span>
                <span className="text-[#555] ml-4">Margin %: </span>
                <span className={calcMarginPct(form.buyerPrice, form.sellerPrice) >= 0 ? 'text-[#00D26A]' : 'text-[#FF4444]'}>
                  {calcMarginPct(form.buyerPrice, form.sellerPrice).toFixed(2)}%
                </span>
              </div>
            )}

            <Field label="Expected Close Date">
              <Input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Advance Received">
              <div className="flex items-center gap-2 h-8">
                <Switch checked={form.advanceReceived} onCheckedChange={v => setForm(f => ({ ...f, advanceReceived: v }))} />
              </div>
            </Field>
            {form.advanceReceived && (
              <Field label="Advance Amount (₹)" className="col-span-2">
                <Input type="number" value={form.advanceAmount || ''} onChange={e => setForm(f => ({ ...f, advanceAmount: Number(e.target.value) }))}
                  className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
              </Field>
            )}
            <Field label="Notes / Next Action" className="col-span-2">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                className="w-full px-3 py-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white resize-none" />
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)}
              className="h-8 px-4 font-mono text-[10px] border border-[#333] text-[#666] hover:text-[#888]">CANCEL</button>
            <button onClick={handleSave}
              className="h-8 px-4 font-mono text-[10px] bg-[#00D26A] text-black font-bold hover:bg-[#00b85e]">
              {editing ? 'SAVE CHANGES' : 'CREATE DEAL'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Deal</DialogTitle></DialogHeader>
          <div className="px-6 py-4 font-mono text-xs text-[#888]">Permanently delete this deal?</div>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)}
              className="h-8 px-4 font-mono text-[10px] border border-[#333] text-[#666]">CANCEL</button>
            <button onClick={() => deleteId && handleDelete(deleteId)}
              className="h-8 px-4 font-mono text-[10px] bg-[#FF4444] text-white font-bold">DELETE</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DealTable({ deals, contacts, sortKey, sortDir, onEdit, onDelete, onStage, SortBtn }: {
  deals: Deal[]; contacts: Contact[]; sortKey: string; sortDir: string;
  onEdit: (d: Deal) => void; onDelete: (id: string) => void;
  onStage: (id: string, s: DealStage) => void;
  SortBtn: React.ComponentType<{ k: any; label: string }>;
}) {
  return (
    <div className="border border-[#222] overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#222] bg-[#0d0d0d]">
            <th className="px-3 py-2 text-left"><SortBtn k="createdAt" label="Deal" /></th>
            <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Commodity</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Qty</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Seller / Buyer</th>
            <th className="px-3 py-2 text-right font-mono text-[10px] text-[#555] tracking-wider uppercase">Prices</th>
            <th className="px-3 py-2 text-right"><SortBtn k="margin" label="Margin" /></th>
            <th className="px-3 py-2 text-left"><SortBtn k="stage" label="Stage" /></th>
            <th className="px-3 py-2 text-left"><SortBtn k="expectedCloseDate" label="Close Date" /></th>
            <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deals.length === 0 && (
            <tr><td colSpan={9} className="px-3 py-8 text-center font-mono text-xs text-[#333]">No deals</td></tr>
          )}
          {deals.map(d => {
            const seller = contacts.find(c => c.id === d.sellerId);
            const buyer = contacts.find(c => c.id === d.buyerId);
            const margin = calcGrossMargin(d.buyerPrice, d.sellerPrice, d.quantity);
            const marginPct = calcMarginPct(d.buyerPrice, d.sellerPrice);
            return (
              <tr key={d.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                <td className="px-3 py-2.5">
                  <div className="font-mono text-xs text-white max-w-[180px] truncate">{d.name}</div>
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#666]">{d.commodity}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#888]">{d.quantity} {d.unit}</td>
                <td className="px-3 py-2.5">
                  <div className="font-mono text-[10px] text-[#666]">S: {seller?.name ?? '—'}</div>
                  <div className="font-mono text-[10px] text-[#666]">B: {buyer?.name ?? '—'}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[10px]">
                  <div className="text-[#555]">↓ ₹{d.sellerPrice.toLocaleString()}</div>
                  <div className="text-[#888]">↑ ₹{d.buyerPrice.toLocaleString()}</div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className={`font-mono text-xs font-bold ${margin >= 0 ? 'text-[#00D26A]' : 'text-[#FF4444]'}`}>
                    {formatCurrency(margin)}
                  </div>
                  <div className={`font-mono text-[10px] ${marginPct >= 0 ? 'text-[#00D26A]/70' : 'text-[#FF4444]/70'}`}>
                    {marginPct.toFixed(1)}%
                  </div>
                </td>
                <td className="px-3 py-2.5">{stageBadge(d.stage)}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#555]">
                  {d.expectedCloseDate ? formatDate(d.expectedCloseDate) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(d)} className="text-[#444] hover:text-[#888]"><Pencil className="w-3.5 h-3.5" /></button>
                    {!['Completed', 'Cancelled'].includes(d.stage) && (
                      <>
                        <button onClick={() => onStage(d.id, 'Completed')} className="text-[#444] hover:text-[#00D26A]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onStage(d.id, 'Cancelled')} className="text-[#444] hover:text-[#FF4444]">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => onDelete(d.id)} className="text-[#444] hover:text-[#FF4444]"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
