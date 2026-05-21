'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Zap, ChevronDown, ChevronUp, Trash2, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { loadPrices, savePrices } from '@/lib/storage';
import type { PriceEntry, PriceSource, PriceUnit } from '@/types';
import { generateId, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { IndiamartSearch } from '@/components/prices/indiamart-search';

const SOURCES: PriceSource[] = ['IndiaMart', 'Phone call', 'Mandi', 'Other'];
const UNITS: PriceUnit[] = ['kg', 'tonne', 'quintal', 'litre'];
const SPREAD_THRESHOLD = 8;

const EMPTY: Omit<PriceEntry, 'id' | 'createdAt'> = {
  commodity: '', grade: '', price: 0, unit: 'kg',
  source: 'Phone call', contactName: '', city: '', region: '',
  dateRecorded: new Date().toISOString().split('T')[0], notes: '',
};

type CommodityStats = {
  commodity: string;
  entries: PriceEntry[];
  low: number;
  high: number;
  spread: number;
  unit: string;
  latest: number;
};

function computeStats(entries: PriceEntry[]): CommodityStats[] {
  const map: Record<string, PriceEntry[]> = {};
  entries.forEach(e => {
    if (!map[e.commodity]) map[e.commodity] = [];
    map[e.commodity].push(e);
  });
  return Object.entries(map).map(([commodity, list]) => {
    const sorted = [...list].sort((a, b) => a.dateRecorded.localeCompare(b.dateRecorded));
    const prices = list.map(e => e.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const spread = high > 0 ? ((high - low) / high) * 100 : 0;
    return {
      commodity,
      entries: sorted,
      low, high, spread,
      unit: list[list.length - 1]?.unit ?? 'kg',
      latest: sorted[sorted.length - 1]?.price ?? 0,
    };
  }).sort((a, b) => b.spread - a.spread);
}

function sourceBadge(s: PriceSource) {
  const v = s === 'IndiaMart' ? 'blue' : s === 'Phone call' ? 'green' : s === 'Mandi' ? 'amber' : 'default';
  return <Badge variant={v as any}>{s}</Badge>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-[#333] px-3 py-2 font-mono text-[10px]">
      <div className="text-[#555] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="text-[#00D26A]">₹{p.value}/{p.payload.unit}</div>
      ))}
    </div>
  );
};

export default function PricesPage() {
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<PriceEntry, 'id' | 'createdAt'>>(EMPTY);
  const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);
  const [filterCommodity, setFilterCommodity] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'dateRecorded' | 'price' | 'commodity'>('dateRecorded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const p = loadPrices();
    setPrices(p);
    if (p.length > 0) {
      const first = p[0].commodity;
      setSelectedCommodity(first);
    }
  }, []);

  const persist = (updated: PriceEntry[]) => { setPrices(updated); savePrices(updated); };

  const handleImport = (entries: PriceEntry[]) => {
    const updated = [...prices, ...entries];
    persist(updated);
    if (!selectedCommodity && entries.length > 0) setSelectedCommodity(entries[0].commodity);
  };

  const handleSave = () => {
    if (!form.commodity.trim() || !form.price) return;
    const newEntry: PriceEntry = { id: generateId(), createdAt: new Date().toISOString(), ...form };
    const updated = [...prices, newEntry];
    persist(updated);
    if (!selectedCommodity) setSelectedCommodity(form.commodity);
    setForm(EMPTY);
    setOpen(false);
  };

  const handleDelete = (id: string) => { persist(prices.filter(p => p.id !== id)); setDeleteId(null); };

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const commodities = useMemo(() => Array.from(new Set(prices.map(p => p.commodity))), [prices]);
  const cities = useMemo(() => Array.from(new Set(prices.map(p => p.city).filter(Boolean))), [prices]);
  const stats = useMemo(() => computeStats(prices), [prices]);
  const spreadAlerts = stats.filter(s => s.spread >= SPREAD_THRESHOLD);

  const filtered = useMemo(() => {
    let list = prices.filter(p => {
      if (filterCommodity !== 'All' && p.commodity !== filterCommodity) return false;
      if (filterCity !== 'All' && p.city !== filterCity) return false;
      if (dateFrom && p.dateRecorded < dateFrom) return false;
      if (dateTo && p.dateRecorded > dateTo) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [prices, filterCommodity, filterCity, dateFrom, dateTo, sortKey, sortDir]);

  const chartData = useMemo(() => {
    if (!selectedCommodity) return [];
    return prices
      .filter(p => p.commodity === selectedCommodity)
      .sort((a, b) => a.dateRecorded.localeCompare(b.dateRecorded))
      .map(p => ({ date: p.dateRecorded, price: p.price, unit: p.unit, source: p.source }));
  }, [prices, selectedCommodity]);

  if (!mounted) return null;

  const SortTh = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort(k)}>
      <span className={`flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase ${sortKey === k ? 'text-[#00D26A]' : 'text-[#555] hover:text-[#888]'}`}>
        {label}
        {sortKey === k ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
      </span>
    </th>
  );

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-mono text-xs font-bold tracking-widest text-white uppercase">
            Price Tracker <span className="text-[#555]">({prices.length} entries)</span>
          </h1>
          <p className="font-mono text-[10px] text-[#555] mt-0.5">Market intelligence log</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY); setOpen(true); }}
          className="h-8 px-3 font-mono text-[10px] tracking-wider bg-[#00D26A] text-black font-bold flex items-center gap-1.5 hover:bg-[#00b85e]"
        >
          <Plus className="w-3 h-3" /> LOG PRICE
        </button>
      </div>

      {/* IndiaMart scraper */}
      <IndiamartSearch onImport={handleImport} />

      {/* Spread alerts */}
      {spreadAlerts.length > 0 && (
        <div className="border border-[#00D26A]/30 bg-[#00D26A]/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#00D26A]" />
            <span className="font-mono text-[11px] text-[#00D26A] font-bold tracking-wider uppercase">
              Arbitrage Opportunities
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {spreadAlerts.map(s => (
              <button
                key={s.commodity}
                onClick={() => setSelectedCommodity(s.commodity)}
                className="bg-[#0a0a0a] border border-[#00D26A]/30 px-3 py-2 text-left hover:border-[#00D26A]/50 transition-colors"
              >
                <div className="font-mono text-xs text-white font-medium">{s.commodity}</div>
                <div className="font-mono text-[10px] mt-0.5">
                  <span className="text-[#FF4444]">↓ ₹{s.low}</span>
                  <span className="text-[#555] mx-1.5">→</span>
                  <span className="text-[#00D26A]">↑ ₹{s.high}</span>
                  <span className="text-[#00D26A] ml-2 font-bold">{s.spread.toFixed(1)}% spread</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commodity stats */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] text-[#555] tracking-wider uppercase px-1">By Commodity</div>
          {stats.length === 0 ? (
            <div className="bg-[#111] border border-[#222] p-4 font-mono text-[11px] text-[#333] text-center">
              No price data yet
            </div>
          ) : (
            stats.map(s => (
              <button
                key={s.commodity}
                onClick={() => setSelectedCommodity(s.commodity)}
                className={`w-full bg-[#111] border p-3 text-left transition-colors ${selectedCommodity === s.commodity ? 'border-[#00D26A]/50' : 'border-[#222] hover:border-[#333]'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-white font-medium">{s.commodity}</span>
                  {s.spread >= SPREAD_THRESHOLD && <Zap className="w-3 h-3 text-[#00D26A]" />}
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-[#555]">Low: <span className="text-[#FF4444]">₹{s.low}/{s.unit}</span></span>
                  <span className="text-[#555]">High: <span className="text-[#00D26A]">₹{s.high}/{s.unit}</span></span>
                </div>
                <div className="mt-2 h-1 bg-[#1a1a1a]">
                  <div
                    className={`h-full ${s.spread >= SPREAD_THRESHOLD ? 'bg-[#00D26A]' : 'bg-[#444]'}`}
                    style={{ width: `${Math.min(s.spread * 5, 100)}%` }}
                  />
                </div>
                <div className={`font-mono text-[10px] mt-1 ${s.spread >= SPREAD_THRESHOLD ? 'text-[#00D26A]' : 'text-[#555]'}`}>
                  {s.spread.toFixed(1)}% spread · {s.entries.length} entries
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-[#111] border border-[#222] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#00D26A]" />
                <span className="font-mono text-[11px] text-[#888] tracking-wider uppercase">
                  Price Trend — {selectedCommodity ?? 'Select commodity'}
                </span>
              </div>
              <select
                value={selectedCommodity ?? ''}
                onChange={e => setSelectedCommodity(e.target.value)}
                className="h-7 px-2 font-mono text-[10px] bg-[#1a1a1a] border border-[#333] text-[#888]"
              >
                <option value="">— Select —</option>
                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {chartData.length < 2 ? (
              <div className="h-40 flex items-center justify-center font-mono text-[11px] text-[#333]">
                {chartData.length === 0 ? 'No data' : 'Need at least 2 entries to show trend'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#555' }}
                    tickFormatter={d => d.slice(5)}
                    axisLine={{ stroke: '#222' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#555' }}
                    axisLine={{ stroke: '#222' }}
                    tickLine={false}
                    tickFormatter={v => `₹${v}`}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#00D26A"
                    strokeWidth={1.5}
                    dot={{ fill: '#00D26A', r: 3, strokeWidth: 0 }}
                    activeDot={{ fill: '#00D26A', r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-[#555] tracking-wider uppercase">Filter:</span>
        <select value={filterCommodity} onChange={e => setFilterCommodity(e.target.value)}
          className="h-7 px-2 font-mono text-[10px] bg-[#111] border border-[#222] text-[#888]">
          <option value="All">All Commodities</option>
          {commodities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
          className="h-7 px-2 font-mono text-[10px] bg-[#111] border border-[#222] text-[#888]">
          <option value="All">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="h-7 font-mono text-[10px] bg-[#111] border-[#222] text-[#888] w-36" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="h-7 font-mono text-[10px] bg-[#111] border-[#222] text-[#888] w-36" placeholder="To" />
        {(filterCommodity !== 'All' || filterCity !== 'All' || dateFrom || dateTo) && (
          <button
            onClick={() => { setFilterCommodity('All'); setFilterCity('All'); setDateFrom(''); setDateTo(''); }}
            className="font-mono text-[10px] text-[#555] hover:text-[#888] underline"
          >Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="border border-[#222] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#222] bg-[#0d0d0d]">
              <SortTh k="commodity" label="Commodity" />
              <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Grade</th>
              <SortTh k="price" label="Price" />
              <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Source</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Contact</th>
              <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">City</th>
              <SortTh k="dateRecorded" label="Date" />
              <th className="px-3 py-2 text-left font-mono text-[10px] text-[#555] tracking-wider uppercase">Notes</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center font-mono text-xs text-[#333]">No entries</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs text-white font-medium">{p.commodity}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#666]">{p.grade || '—'}</td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-[#00D26A] font-bold">₹{p.price.toLocaleString()}</span>
                  <span className="font-mono text-[10px] text-[#555] ml-1">/{p.unit}</span>
                </td>
                <td className="px-3 py-2.5">{sourceBadge(p.source)}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#666]">{p.contactName || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#555]">{p.city || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#555]">{formatDate(p.dateRecorded)}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-[#444] max-w-[200px] truncate">{p.notes || '—'}</td>
                <td className="px-3 py-2.5">
                  <button onClick={() => setDeleteId(p.id)} className="text-[#444] hover:text-[#FF4444]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Log Price Entry</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 grid grid-cols-2 gap-3">
            <Field label="Commodity *">
              <Input value={form.commodity} onChange={e => setForm(f => ({ ...f, commodity: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white"
                placeholder="e.g. Copper Scrap" />
            </Field>
            <Field label="Grade / Quality">
              <Input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white"
                placeholder="e.g. Grade A" />
            </Field>
            <Field label="Price *">
              <Input type="number" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Unit">
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value as PriceUnit }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as PriceSource }))}
                className="w-full h-8 px-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white">
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <Input type="date" value={form.dateRecorded} onChange={e => setForm(f => ({ ...f, dateRecorded: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Contact Name">
              <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" placeholder="Optional" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" />
            </Field>
            <Field label="Region">
              <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className="h-8 font-mono text-xs bg-[#1a1a1a] border-[#333] text-white" placeholder="e.g. North India" />
            </Field>
            <Field label="Notes" className="col-span-2">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white resize-none" />
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)}
              className="h-8 px-4 font-mono text-[10px] border border-[#333] text-[#666]">CANCEL</button>
            <button onClick={handleSave}
              className="h-8 px-4 font-mono text-[10px] bg-[#00D26A] text-black font-bold hover:bg-[#00b85e]">
              LOG PRICE
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Entry</DialogTitle></DialogHeader>
          <div className="px-6 py-4 font-mono text-xs text-[#888]">Delete this price entry?</div>
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="font-mono text-[10px] text-[#555] tracking-wider uppercase mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
