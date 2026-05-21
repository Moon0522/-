"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadLastResult, loadLastPurchase } from "@/lib/storage";
import type { PurchaseResult, PurchaseRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Lightbulb, TrendingDown, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function ScoreBar({ score, verdict }: { score: number; verdict: string }) {
  const [width, setWidth] = useState(0);
  const barColor =
    verdict === "BUY" ? "#22c55e" : verdict === "WAIT" ? "#f5a623" : "#ef4444";

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-xs text-[#555] uppercase tracking-widest">
          Affordability Score
        </span>
        <span className="font-mono text-2xl font-semibold" style={{ color: barColor }}>
          {score}
          <span className="text-sm text-[#555] font-normal">/100</span>
        </span>
      </div>
      <div className="h-1.5 bg-surface-tertiary w-full overflow-hidden">
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: barColor }}
        />
      </div>
      {/* Threshold markers */}
      <div className="relative mt-1 h-3">
        <div className="absolute left-[45%] top-0 w-px h-3 bg-[#333]" />
        <div className="absolute left-[75%] top-0 w-px h-3 bg-[#333]" />
        <span className="absolute left-[44%] top-0 font-mono text-[9px] text-[#444] -translate-x-1/2">45</span>
        <span className="absolute left-[75%] top-0 font-mono text-[9px] text-[#444] -translate-x-1/2">75</span>
      </div>
      <div className="flex gap-4 mt-2">
        <span className="font-mono text-[9px] text-verdict-avoid tracking-widest">AVOID 0–44</span>
        <span className="font-mono text-[9px] text-verdict-wait tracking-widest">WAIT 45–74</span>
        <span className="font-mono text-[9px] text-verdict-buy tracking-widest">BUY 75–100</span>
      </div>
    </div>
  );
}

function SpendVisualiser({
  before,
  after,
  price,
}: {
  before: number;
  after: number;
  price: number;
}) {
  const maxVal = Math.max(Math.abs(before), price, 100);
  const beforePct = Math.min(100, Math.max(0, (before / maxVal) * 100));
  const afterPct = Math.min(100, Math.max(0, (after / maxVal) * 100));

  return (
    <div className="border border-surface-border bg-surface p-5">
      <p className="font-mono text-xs text-[#555] uppercase tracking-widest mb-5">
        Safe-to-Spend Visualisation
      </p>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-xs text-[#666]">Before purchase</span>
            <span
              className={`font-mono text-sm ${before >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}
            >
              {formatCurrency(before)}
            </span>
          </div>
          <div className="h-6 bg-surface-tertiary w-full overflow-hidden">
            <div
              className="h-full bg-verdict-buy/40 border-r border-verdict-buy transition-all duration-700"
              style={{ width: `${beforePct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-xs text-[#666]">After purchase</span>
            <span
              className={`font-mono text-sm ${after >= 0 ? "text-[#e8e4d9]" : "text-verdict-avoid"}`}
            >
              {formatCurrency(after)}
            </span>
          </div>
          <div className="h-6 bg-surface-tertiary w-full overflow-hidden">
            <div
              className={`h-full border-r transition-all duration-700 delay-200 ${
                after >= 0
                  ? "bg-amber-400/30 border-amber-400"
                  : "bg-verdict-avoid/30 border-verdict-avoid"
              }`}
              style={{ width: `${afterPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-surface-border flex justify-between">
        <span className="font-mono text-xs text-[#555]">Cost of purchase</span>
        <span className="font-mono text-sm text-[#e8e4d9]">
          {formatCurrency(price)}
        </span>
      </div>
    </div>
  );
}

function DeductionsTable({ deductions }: { deductions: { reason: string; points: number }[] }) {
  if (deductions.length === 0) return null;
  return (
    <div className="border border-surface-border bg-surface p-5">
      <p className="font-mono text-xs text-[#555] uppercase tracking-widest mb-4">
        Score Deductions
      </p>
      <div className="space-y-2">
        {deductions.map((d, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="font-mono text-xs text-[#888]">{d.reason}</span>
            <span className="font-mono text-sm text-verdict-avoid">−{d.points}</span>
          </div>
        ))}
        <div className="border-t border-surface-border pt-2 flex justify-between items-center">
          <span className="font-mono text-xs text-[#555]">Total deducted</span>
          <span className="font-mono text-sm text-verdict-avoid">
            −{deductions.reduce((a, d) => a + d.points, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [purchase, setPurchase] = useState<PurchaseRequest | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const r = loadLastResult();
    const p = loadLastPurchase();
    if (!r || !p) {
      router.push("/check");
      return;
    }
    setResult(r);
    setPurchase(p);
  }, [router]);

  if (!mounted || !result || !purchase) return null;

  const verdictColor =
    result.verdict === "BUY"
      ? "#22c55e"
      : result.verdict === "WAIT"
      ? "#f5a623"
      : "#ef4444";

  const verdictBg =
    result.verdict === "BUY"
      ? "bg-verdict-buy/5 border-verdict-buy/20"
      : result.verdict === "WAIT"
      ? "bg-verdict-wait/5 border-verdict-wait/20"
      : "bg-verdict-avoid/5 border-verdict-avoid/20";

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/check")}
          className="font-mono text-xs text-[#555] hover:text-amber-400 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3 h-3" />
          New Check
        </button>
        <span className="text-surface-border">|</span>
        <span className="font-mono text-xs text-amber-400 tracking-widest uppercase">
          Verdict
        </span>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {/* Purchase title */}
        <div className="mb-8 animate-fade-in-up">
          <p className="font-mono text-xs text-[#555] uppercase tracking-widest mb-2">
            Evaluating
          </p>
          <h1
            className="text-3xl font-serif text-[#e8e4d9] mb-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {purchase.itemName}
          </h1>
          <p className="font-mono text-sm text-amber-400">
            {formatCurrency(purchase.price)}{" "}
            <span className="text-[#555]">·</span>{" "}
            <span className="text-[#666] capitalize">{purchase.category}</span>{" "}
            <span className="text-[#555]">·</span>{" "}
            <span className="text-[#666] capitalize">{purchase.urgency.replace("-", " ")}</span>
          </p>
        </div>

        {/* Verdict card */}
        <div
          className={`border p-6 mb-6 animate-fade-in-up animate-delay-100 ${verdictBg}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-[#555] uppercase tracking-widest mb-2">
                Verdict
              </p>
              <h2
                className="text-6xl md:text-7xl font-serif font-medium tracking-tight"
                style={{ color: verdictColor, fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {result.verdict}
              </h2>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-[#555] uppercase tracking-widest mb-1">
                Payday in
              </p>
              <p className="font-mono text-2xl font-semibold text-[#e8e4d9]">
                {result.daysUntilPayday}
                <span className="text-sm text-[#555] font-normal ml-1">days</span>
              </p>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="font-mono text-sm text-[#aaa] leading-relaxed">
              {result.explanation}
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div
          className="border border-surface-border bg-surface p-5 mb-6 animate-fade-in-up animate-delay-200"
        >
          <ScoreBar score={result.score} verdict={result.verdict} />
        </div>

        {/* Spend visualiser */}
        <div className="mb-6 animate-fade-in-up animate-delay-300">
          <SpendVisualiser
            before={result.safeToSpend}
            after={result.safeToSpendAfter}
            price={purchase.price}
          />
        </div>

        {/* Pros and Cons */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in-up animate-delay-400"
        >
          {/* Pros */}
          <div className="border border-verdict-buy/20 bg-verdict-buy/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-3.5 h-3.5 text-verdict-buy" />
              <p className="font-mono text-xs text-verdict-buy uppercase tracking-widest">
                For buying now
              </p>
            </div>
            <ul className="space-y-2.5">
              {result.pros.map((pro, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-verdict-buy mt-0.5 flex-shrink-0 font-mono text-xs">+</span>
                  <span className="font-mono text-xs text-[#aaa] leading-relaxed">{pro}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="border border-verdict-avoid/20 bg-verdict-avoid/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-3.5 h-3.5 text-verdict-avoid" />
              <p className="font-mono text-xs text-verdict-avoid uppercase tracking-widest">
                Against buying now
              </p>
            </div>
            <ul className="space-y-2.5">
              {result.cons.map((con, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-verdict-avoid mt-0.5 flex-shrink-0 font-mono text-xs">−</span>
                  <span className="font-mono text-xs text-[#aaa] leading-relaxed">{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Alternatives */}
        <div className="border border-surface-border bg-surface p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <p className="font-mono text-xs text-amber-400 uppercase tracking-widest">
              Smart Alternatives
            </p>
          </div>
          <ul className="space-y-3">
            {result.alternatives.map((alt, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="font-mono text-xs text-amber-400/40 mt-0.5 flex-shrink-0 w-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs text-[#aaa] leading-relaxed">{alt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Deductions */}
        <DeductionsTable deductions={result.deductions} />

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/setup")}
            className="font-mono text-xs tracking-wider"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Update Finances
          </Button>
          <Button
            onClick={() => router.push("/check")}
            className="font-mono text-sm tracking-wider"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Check Another
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
