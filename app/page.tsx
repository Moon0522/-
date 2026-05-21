'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, TrendingUp, LineChart, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Zap, IndianRupee,
} from 'lucide-react';
import {
  loadContacts, loadDeals, loadPrices,
  saveContacts, saveDeals, savePrices, isSeeded, markSeeded,
} from '@/lib/storage';
import { SEED_CONTACTS, SEED_DEALS, SEED_PRICES } from '@/lib/seed';
import type { Contact, Deal, PriceEntry } from '@/types';
import { formatCurrency, formatDate, isOverdue, isDueThisWeek, calcGrossMargin } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const STAGES_ORDER = ['Inquiry', 'Negotiating', 'Sample Sent', 'PO Received', 'In Transit'] as const;

function calcSpread(entries: PriceEntry[]): Array<{ commodity: string; low: number; high: number; spread: number; unit: string }> {
  const map: Record<string, { prices: number[]; unit: string }> = {};
  entries.forEach(e => {
    if (!map[e.commodity]) map[e.commodity] = { prices: [], unit: e.unit };
    map[e.commodity].prices.push(e.price);
  });
  return Object.entries(map)
    .map(([commodity, { prices, unit }]) => {
      const low = Math.min(...prices);
      const high = Math.max(...prices);
      const spread = high > 0 ? ((high - low) / high) * 100 : 0;
      return { commodity, low, high, spread, unit };
    })
    .filter(s => s.spread > 0)
    .sort((a, b) => b.spread - a.spread)
    .slice(0, 3);
}

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isSeeded()) {
      saveContacts(SEED_CONTACTS);
      saveDeals(SEED_DEALS);
      savePrices(SEED_PRICES);
      markSeeded();
    }
    setContacts(loadContacts());
    setDeals(loadDeals());
    setPrices(loadPrices());
  }, []);

  if (!mounted) return <div className="p-6 font-mono text-[#333] text-xs">LOADING...</div>;

  const overdueFollowUps = contacts.filter(c => c.status !== 'Blacklisted' && isOverdue(c.followUpDate));
  const closingThisWeek = deals.filter(d => !['Completed', 'Cancelled'].includes(d.stage) && isDueThisWeek(d.expectedCloseDate));
  const activeDeals = deals.filter(d => !['Completed', 'Cancelled'].includes(d.stage));
  const completedDeals = deals.filter(d => d.stage === 'Completed');

  const now = new Date();
  const thisMonth = completedDeals.filter(d => {
    const created = new Date(d.createdAt);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });
  const monthProfit = thisMonth.reduce((sum, d) => sum + calcGrossMargin(d.buyerPrice, d.sellerPrice, d.quantity), 0);

  const pipelineValue = activeDeals.reduce((sum, d) => sum + d.buyerPrice * d.quantity, 0);
  const pipelineMargin = activeDeals.reduce((sum, d) => sum + calcGrossMargin(d.buyerPrice, d.sellerPrice, d.quantity), 0);

  const stageData = STAGES_ORDER.map(stage => ({
    stage,
    count: activeDeals.filter(d => d.stage === stage).length,
    value: activeDeals.filter(d => d.stage === stage).reduce((s, d) => s + d.buyerPrice * d.quantity, 0),
  }));
  const maxVal = Math.max(...stageData.map(s => s.value), 1);

  const spreadAlerts = calcSpread(prices);

  return (
    <div className="p-4 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-sm font-bold tracking-widest text-white uppercase">Command Center</h1>
          <p className="font-mono text-[10px] text-[#555] tracking-wider mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Follow-up alert banner */}
      {overdueFollowUps.length > 0 && (
        <div className="border border-[#F5A623]/40 bg-[#F5A623]/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
            <span className="font-mono text-xs text-[#F5A623]">
              {overdueFollowUps.length} OVERDUE FOLLOW-UP{overdueFollowUps.length > 1 ? 'S' : ''} —{' '}
              {overdueFollowUps.slice(0, 3).map(c => c.name).join(', ')}
              {overdueFollowUps.length > 3 ? ` +${overdueFollowUps.length - 3} more` : ''}
            </span>
          </div>
          <Link href="/contacts" className="font-mono text-[10px] text-[#F5A623] hover:underline flex items-center gap-1">
            VIEW ALL <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          {
            label: 'Pipeline Value',
            value: formatCurrency(pipelineValue),
            sub: `${activeDeals.length} active deals`,
            icon: IndianRupee,
            color: '#00D26A',
            href: '/deals',
          },
          {
            label: 'Expected Margin',
            value: formatCurrency(pipelineMargin),
            sub: pipelineValue > 0 ? `${((pipelineMargin / pipelineValue) * 100).toFixed(1)}% avg margin` : '—',
            icon: TrendingUp,
            color: '#00D26A',
            href: '/deals',
          },
          {
            label: 'Month Profit',
            value: formatCurrency(monthProfit),
            sub: `${thisMonth.length} deals closed`,
            icon: CheckCircle2,
            color: monthProfit >= 0 ? '#00D26A' : '#FF4444',
            href: '/deals',
          },
          {
            label: 'Contacts',
            value: contacts.filter(c => c.status === 'Active').length.toString(),
            sub: `${overdueFollowUps.length} follow-ups due`,
            icon: Users,
            color: overdueFollowUps.length > 0 ? '#F5A623' : '#00D26A',
            href: '/contacts',
          },
        ].map(kpi => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="bg-[#111] border border-[#222] p-4 hover:border-[#333] transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-[#555] tracking-wider uppercase">{kpi.label}</span>
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
            </div>
            <div className="font-mono text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="font-mono text-[10px] text-[#444] mt-1">{kpi.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pipeline by Stage */}
        <div className="md:col-span-2 bg-[#111] border border-[#222] p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#888] tracking-wider uppercase">Pipeline by Stage</span>
            <Link href="/deals" className="font-mono text-[10px] text-[#555] hover:text-[#00D26A] flex items-center gap-1">
              Full View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {stageData.map(s => (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[#555] w-24 shrink-0 tracking-wide">{s.stage.toUpperCase()}</span>
                <div className="flex-1 h-5 bg-[#1a1a1a] border border-[#222] overflow-hidden">
                  <div
                    className="h-full bg-[#00D26A]/20 border-r border-[#00D26A]/40 transition-all"
                    style={{ width: `${(s.value / maxVal) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[#555] w-16 text-right shrink-0">{formatCurrency(s.value)}</span>
                <span className="font-mono text-[10px] text-[#333] w-6 text-right shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spread Opportunities */}
        <div className="bg-[#111] border border-[#222] p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] text-[#888] tracking-wider uppercase">Spread Opportunities</span>
            <Link href="/prices" className="font-mono text-[10px] text-[#555] hover:text-[#00D26A] flex items-center gap-1">
              <LineChart className="w-3 h-3" />
            </Link>
          </div>
          {spreadAlerts.length === 0 ? (
            <div className="font-mono text-[11px] text-[#333] text-center py-4">No spread data yet</div>
          ) : (
            <div className="space-y-3">
              {spreadAlerts.map(s => (
                <div key={s.commodity} className={`p-3 border ${s.spread >= 8 ? 'border-[#00D26A]/30 bg-[#00D26A]/5' : 'border-[#222]'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-white font-medium">{s.commodity}</span>
                    {s.spread >= 8 && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-[#00D26A]" />
                        <span className="font-mono text-[10px] text-[#00D26A]">OPPORTUNITY</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-[#FF4444]">↓ ₹{s.low}/{s.unit}</span>
                    <span className="text-[#333]">→</span>
                    <span className="text-[#00D26A]">↑ ₹{s.high}/{s.unit}</span>
                  </div>
                  <div className="mt-1.5 h-1 bg-[#1a1a1a]">
                    <div
                      className={`h-full ${s.spread >= 8 ? 'bg-[#00D26A]' : 'bg-[#444]'}`}
                      style={{ width: `${Math.min(s.spread * 5, 100)}%` }}
                    />
                  </div>
                  <span className={`font-mono text-[10px] mt-1 block ${s.spread >= 8 ? 'text-[#00D26A]' : 'text-[#555]'}`}>
                    {s.spread.toFixed(1)}% spread
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deals closing this week */}
        <div className="bg-[#111] border border-[#222] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] text-[#888] tracking-wider uppercase">Closing This Week</span>
            <Badge variant={closingThisWeek.length > 0 ? 'amber' : 'ghost'}>{closingThisWeek.length} deals</Badge>
          </div>
          {closingThisWeek.length === 0 ? (
            <div className="font-mono text-[11px] text-[#333] py-2">No deals due this week</div>
          ) : (
            <div className="space-y-2">
              {closingThisWeek.map(d => (
                <Link key={d.id} href="/deals" className="flex items-center justify-between p-2 bg-[#1a1a1a] border border-[#222] hover:border-[#333] transition-colors">
                  <div>
                    <div className="font-mono text-xs text-white">{d.name}</div>
                    <div className="font-mono text-[10px] text-[#555] mt-0.5">
                      <span className="text-[#F5A623]">{d.stage}</span> · Close {formatDate(d.expectedCloseDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-[#00D26A]">
                      {formatCurrency(calcGrossMargin(d.buyerPrice, d.sellerPrice, d.quantity))}
                    </div>
                    <div className="font-mono text-[10px] text-[#555]">margin</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Today's follow-ups */}
        <div className="bg-[#111] border border-[#222] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] text-[#888] tracking-wider uppercase">Follow-ups Due</span>
            <Badge variant={overdueFollowUps.length > 0 ? 'amber' : 'ghost'}>{overdueFollowUps.length} overdue</Badge>
          </div>
          {overdueFollowUps.length === 0 ? (
            <div className="font-mono text-[11px] text-[#333] py-2">All caught up!</div>
          ) : (
            <div className="space-y-2">
              {overdueFollowUps.slice(0, 5).map(c => (
                <Link key={c.id} href="/contacts" className="flex items-center justify-between p-2 bg-[#1a1a1a] border border-[#222] hover:border-[#333] transition-colors">
                  <div>
                    <div className="font-mono text-xs text-white">{c.name}</div>
                    <div className="font-mono text-[10px] text-[#555] mt-0.5">{c.company} · {c.commodity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] text-[#F5A623]">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatDate(c.followUpDate)}
                    </div>
                    <div className="font-mono text-[10px] text-[#555] capitalize">{c.role}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
