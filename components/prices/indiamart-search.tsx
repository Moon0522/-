'use client';

import { useState } from 'react';
import { Search, Download, AlertTriangle, CheckSquare, Square, Loader2, ExternalLink, X, Zap } from 'lucide-react';
import type { ScrapeResult } from '@/app/api/scrape/route';
import type { PriceEntry, PriceUnit } from '@/types';
import { generateId } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
  onImport: (entries: PriceEntry[]) => void;
}

type ApiResponse = {
  query: string;
  sellers: ScrapeResult[];
  buyers: ScrapeResult[];
  total: number;
  error: string | null;
  timestamp: string;
};

function normaliseUnit(raw: string): PriceUnit {
  const u = raw.toLowerCase();
  if (u.includes('tonne') || u === 'mt') return 'tonne';
  if (u.includes('quintal')) return 'quintal';
  if (u.includes('litre') || u.includes('ltr')) return 'litre';
  return 'kg';
}

export function IndiamartSearch({ onImport }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setData(null);
    setSelected(new Set());
    try {
      const res = await fetch(`/api/scrape?q=${encodeURIComponent(query.trim())}`);
      const json: ApiResponse = await res.json();
      setData(json);
      // Auto-select all results
      const ids = new Set([
        ...json.sellers.map((_, i) => `s-${i}`),
        ...json.buyers.map((_, i) => `b-${i}`),
      ]);
      setSelected(ids);
    } catch {
      setData({ query, sellers: [], buyers: [], total: 0, error: 'Network error — check your connection.', timestamp: '' });
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (type: 'sellers' | 'buyers', results: ScrapeResult[]) => {
    const ids = results.map((_, i) => `${type[0]}-${i}`);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const importSelected = () => {
    if (!data) return;
    const entries: PriceEntry[] = [];
    data.sellers.forEach((r, i) => {
      if (!selected.has(`s-${i}`) || !r.price) return;
      entries.push({
        id: generateId(),
        commodity: data.query,
        grade: '',
        price: r.price,
        unit: normaliseUnit(r.unit),
        source: 'IndiaMart',
        contactName: r.company,
        city: r.city,
        region: '',
        dateRecorded: new Date().toISOString().split('T')[0],
        notes: `${r.product} — Seller listing`,
        createdAt: new Date().toISOString(),
      });
    });
    data.buyers.forEach((r, i) => {
      if (!selected.has(`b-${i}`) || !r.price) return;
      entries.push({
        id: generateId(),
        commodity: data.query,
        grade: '',
        price: r.price,
        unit: normaliseUnit(r.unit),
        source: 'IndiaMart',
        contactName: r.company,
        city: r.city,
        region: '',
        dateRecorded: new Date().toISOString().split('T')[0],
        notes: `${r.product} — Buyer requirement`,
        createdAt: new Date().toISOString(),
      });
    });
    if (entries.length > 0) onImport(entries);
  };

  const withPrice = [...(data?.sellers || []).map((r, i) => ({ ...r, id: `s-${i}` })),
    ...(data?.buyers || []).map((r, i) => ({ ...r, id: `b-${i}` }))].filter(r => r.price > 0);
  const selectedWithPrice = withPrice.filter(r => selected.has(r.id)).length;

  return (
    <div className="bg-[#111] border border-[#222] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-[#00D26A]" />
        <span className="font-mono text-[11px] text-[#888] tracking-wider uppercase font-bold">
          Search IndiaMart
        </span>
        <span className="font-mono text-[10px] text-[#444]">— live buyers & sellers with prices</span>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && search()}
          placeholder="e.g. copper scrap, aluminium ingots, brass..."
          className="flex-1 h-9 px-3 font-mono text-xs bg-[#1a1a1a] border border-[#333] text-white placeholder:text-[#444] focus:border-[#00D26A]/50 focus:outline-none"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="h-9 px-4 font-mono text-[10px] tracking-wider bg-[#00D26A] text-black font-bold hover:bg-[#00b85e] disabled:opacity-40 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {loading ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </div>

      {/* Note */}
      <div className="flex items-start gap-1.5 bg-[#1a1a1a] border border-[#333] px-3 py-2">
        <AlertTriangle className="w-3 h-3 text-[#F5A623] shrink-0 mt-0.5" />
        <span className="font-mono text-[10px] text-[#666]">
          Works only when running locally on your home network. IndiaMart blocks cloud/server IPs.
        </span>
      </div>

      {/* Error */}
      {data?.error && data.total === 0 && (
        <div className="border border-[#FF4444]/30 bg-[#FF4444]/5 px-3 py-2 font-mono text-[11px] text-[#FF4444]">
          {data.error}
        </div>
      )}

      {/* Results */}
      {data && data.total > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#555]">
              {data.sellers.length} sellers · {data.buyers.length} buyers found for <span className="text-white">"{data.query}"</span>
            </span>
            {selectedWithPrice > 0 && (
              <button
                onClick={importSelected}
                className="h-7 px-3 font-mono text-[10px] tracking-wider bg-[#00D26A] text-black font-bold hover:bg-[#00b85e] flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                IMPORT {selectedWithPrice} PRICES
              </button>
            )}
          </div>

          {/* Spread preview */}
          {data.sellers.length > 0 && data.buyers.length > 0 && (() => {
            const sp = data.sellers.filter(r => r.price > 0).map(r => r.price);
            const bp = data.buyers.filter(r => r.price > 0).map(r => r.price);
            if (sp.length && bp.length) {
              const lowSell = Math.min(...sp);
              const highBuy = Math.max(...bp);
              const spread = highBuy > 0 ? ((highBuy - lowSell) / highBuy) * 100 : 0;
              if (spread > 0) return (
                <div className={`flex items-center gap-3 px-3 py-2 border ${spread >= 8 ? 'border-[#00D26A]/40 bg-[#00D26A]/5' : 'border-[#222]'}`}>
                  <Zap className={`w-3.5 h-3.5 shrink-0 ${spread >= 8 ? 'text-[#00D26A]' : 'text-[#555]'}`} />
                  <span className="font-mono text-[10px]">
                    <span className="text-[#555]">Best spread: </span>
                    <span className="text-[#FF4444]">Buy ₹{lowSell}</span>
                    <span className="text-[#555]"> → </span>
                    <span className="text-[#00D26A]">Sell ₹{highBuy}</span>
                    <span className={`ml-2 font-bold ${spread >= 8 ? 'text-[#00D26A]' : 'text-[#888]'}`}>
                      {spread.toFixed(1)}% margin{spread >= 8 ? ' 🔥' : ''}
                    </span>
                  </span>
                </div>
              );
            }
          })()}

          {/* Sellers table */}
          {data.sellers.length > 0 && (
            <ResultTable
              title="SELLERS"
              type="s"
              results={data.sellers}
              selected={selected}
              onToggle={toggle}
              onToggleAll={() => toggleAll('sellers', data.sellers)}
            />
          )}

          {/* Buyers table */}
          {data.buyers.length > 0 && (
            <ResultTable
              title="BUYERS"
              type="b"
              results={data.buyers}
              selected={selected}
              onToggle={toggle}
              onToggleAll={() => toggleAll('buyers', data.buyers)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ResultTable({ title, type, results, selected, onToggle, onToggleAll }: {
  title: string;
  type: 's' | 'b';
  results: ScrapeResult[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const ids = results.map((_, i) => `${type}-${i}`);
  const allChecked = ids.every(id => selected.has(id));

  return (
    <div>
      <div
        className={`px-3 py-1.5 border border-b-0 flex items-center justify-between cursor-pointer ${type === 's' ? 'border-[#333] bg-[#0d0d0d]' : 'border-[#333] bg-[#0d0d0d]'}`}
        onClick={onToggleAll}
      >
        <div className="flex items-center gap-2">
          {allChecked
            ? <CheckSquare className="w-3.5 h-3.5 text-[#00D26A]" />
            : <Square className="w-3.5 h-3.5 text-[#444]" />
          }
          <span className={`font-mono text-[10px] tracking-wider font-bold ${type === 's' ? 'text-[#00D26A]' : 'text-[#4FC3F7]'}`}>
            {title} ({results.length})
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#444]">click to toggle all</span>
      </div>
      <div className="border border-[#333] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#222] bg-[#0a0a0a]">
              <th className="w-8 px-2 py-1.5" />
              <th className="px-3 py-1.5 text-left font-mono text-[9px] text-[#444] tracking-wider uppercase">Company</th>
              <th className="px-3 py-1.5 text-left font-mono text-[9px] text-[#444] tracking-wider uppercase">Product</th>
              <th className="px-3 py-1.5 text-right font-mono text-[9px] text-[#444] tracking-wider uppercase">Price</th>
              <th className="px-3 py-1.5 text-left font-mono text-[9px] text-[#444] tracking-wider uppercase">City</th>
              <th className="w-8 px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const id = `${type}-${i}`;
              const hasPrice = r.price > 0;
              return (
                <tr key={id}
                  className="border-b border-[#1a1a1a] hover:bg-[#111] cursor-pointer transition-colors"
                  onClick={() => onToggle(id)}
                >
                  <td className="px-2 py-2 text-center">
                    {selected.has(id) && hasPrice
                      ? <CheckSquare className="w-3.5 h-3.5 text-[#00D26A] mx-auto" />
                      : <Square className="w-3.5 h-3.5 text-[#333] mx-auto" />
                    }
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-white max-w-[160px] truncate">{r.company || '—'}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-[#666] max-w-[180px] truncate">{r.product || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {hasPrice
                      ? <span className={`font-mono text-xs font-bold ${type === 's' ? 'text-[#FF4444]' : 'text-[#00D26A]'}`}>
                          ₹{r.price.toLocaleString()}/{r.unit}
                        </span>
                      : <span className="font-mono text-[10px] text-[#333]">{r.priceRaw || '—'}</span>
                    }
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-[#555]">{r.city || '—'}</td>
                  <td className="px-2 py-2">
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[#333] hover:text-[#555]">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
