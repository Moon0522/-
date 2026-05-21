"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadProfile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const profile = loadProfile();
    setHasProfile(!!profile);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-amber-400 tracking-widest uppercase">CANIBUYIT</span>
          <span className="text-surface-border">|</span>
          <span className="font-mono text-xs text-[#555] tracking-widest uppercase">Pre-purchase Intelligence</span>
        </div>
        {hasProfile && (
          <button
            onClick={() => router.push("/setup")}
            className="font-mono text-xs text-[#555] hover:text-amber-400 transition-colors tracking-widest uppercase"
          >
            Edit Profile
          </button>
        )}
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 max-w-3xl mx-auto w-full text-center">
        <div className="animate-fade-in-up">
          <p className="font-mono text-xs text-amber-400 tracking-widest uppercase mb-6">
            Financial Decision Engine v1.0
          </p>
          <h1
            className="text-5xl md:text-7xl font-serif font-medium text-[#e8e4d9] mb-6 leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Can I buy it?
          </h1>
          <p className="text-[#888] text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            A pre-purchase decision assistant that checks your real financial position
            and returns a clear verdict — <span className="text-verdict-buy">Buy</span>,{" "}
            <span className="text-verdict-wait">Wait</span>, or{" "}
            <span className="text-verdict-avoid">Avoid</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {hasProfile ? (
              <>
                <Button
                  onClick={() => router.push("/check")}
                  size="lg"
                  className="h-12 px-8 font-mono text-sm tracking-wider"
                >
                  Check a Purchase
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/setup")}
                  size="lg"
                  className="h-12 px-8 font-mono text-sm tracking-wider"
                >
                  Update Finances
                </Button>
              </>
            ) : (
              <Button
                onClick={() => router.push("/setup")}
                size="lg"
                className="h-12 px-8 font-mono text-sm tracking-wider"
              >
                Set Up My Finances
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Feature triptych */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 w-full animate-fade-in-up animate-delay-200"
        >
          {[
            {
              icon: <Shield className="w-5 h-5 text-amber-400" />,
              title: "Financially Honest",
              desc: "Checks real safe-to-spend after rent, bills, and savings — not just your balance.",
            },
            {
              icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
              title: "Scored Verdict",
              desc: "Affordability scored 0–100 with full breakdown of every deduction.",
            },
            {
              icon: <Zap className="w-5 h-5 text-amber-400" />,
              title: "Smart Alternatives",
              desc: "If now isn't right, you get 3–4 actionable alternatives instead of just a 'no'.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="border border-surface-border bg-surface p-5 text-left"
            >
              <div className="mb-3">{f.icon}</div>
              <h3 className="font-serif text-base text-[#e8e4d9] mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {f.title}
              </h3>
              <p className="font-mono text-xs text-[#666] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-4 text-center">
        <p className="font-mono text-xs text-[#444] tracking-wider">
          DATA STORED LOCALLY — NEVER SENT TO A SERVER
        </p>
      </footer>
    </main>
  );
}
