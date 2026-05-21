"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadProfile, saveLastPurchase, saveLastResult } from "@/lib/storage";
import { calculateVerdict } from "@/lib/calculator";
import type { PurchaseRequest, Category, Urgency } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";

const defaultPurchase: PurchaseRequest = {
  itemName: "",
  price: 0,
  category: "other",
  urgency: "nice-to-have",
  reason: "",
};

const categoryLabels: Record<Category, string> = {
  fashion: "Fashion & Clothing",
  food: "Food & Dining",
  tech: "Tech & Electronics",
  travel: "Travel & Experience",
  other: "Other",
};

const urgencyLabels: Record<Urgency, { label: string; desc: string }> = {
  essential: { label: "Essential", desc: "Need it — life or work depends on it" },
  "nice-to-have": { label: "Nice to Have", desc: "Would improve things but not urgent" },
  impulse: { label: "Impulse", desc: "Saw it and want it right now" },
};

export default function CheckPage() {
  const router = useRouter();
  const [form, setForm] = useState<PurchaseRequest>(defaultPurchase);
  const [errors, setErrors] = useState<Partial<Record<keyof PurchaseRequest, string>>>({});
  const [profileMissing, setProfileMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const profile = loadProfile();
    if (!profile) setProfileMissing(true);
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof PurchaseRequest, string>> = {};
    if (!form.itemName.trim()) e.itemName = "Item name is required";
    if (form.price <= 0) e.price = "Price must be greater than 0";
    if (!form.reason.trim()) e.reason = "Tell us why you want to buy this";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const profile = loadProfile();
    if (!profile) {
      router.push("/setup");
      return;
    }
    setSubmitting(true);
    const result = calculateVerdict(profile, form);
    saveLastPurchase(form);
    saveLastResult(result);
    router.push("/result");
  }

  if (profileMissing) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="font-mono text-xs text-amber-400 uppercase tracking-widest mb-4">
            No Financial Profile
          </p>
          <h2
            className="text-3xl font-serif text-[#e8e4d9] mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Set up first
          </h2>
          <p className="font-mono text-xs text-[#666] mb-8">
            We need your financial information before we can evaluate purchases.
          </p>
          <Button onClick={() => router.push("/setup")} className="font-mono text-sm tracking-wider">
            Set Up Finances
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="font-mono text-xs text-[#555] hover:text-amber-400 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
        <span className="text-surface-border">|</span>
        <span className="font-mono text-xs text-amber-400 tracking-widest uppercase">
          Purchase Check
        </span>
        <button
          onClick={() => router.push("/setup")}
          className="font-mono text-xs text-[#555] hover:text-amber-400 transition-colors ml-auto tracking-wider"
        >
          Edit Finances
        </button>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 border border-amber-400/30 bg-amber-400/5 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <h1
              className="text-4xl font-serif text-[#e8e4d9]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              What do you want to buy?
            </h1>
          </div>
          <p className="font-mono text-xs text-[#666]">
            Give us the details and we&apos;ll run the numbers against your financial position.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Item name */}
          <div className="space-y-1.5">
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              type="text"
              placeholder="e.g. Sony WH-1000XM5 Headphones"
              value={form.itemName}
              onChange={(e) => {
                setForm((p) => ({ ...p, itemName: e.target.value }));
                if (errors.itemName) setErrors((p) => ({ ...p, itemName: undefined }));
              }}
              className={errors.itemName ? "border-red-500/50" : ""}
            />
            {errors.itemName && (
              <p className="font-mono text-xs text-red-400">{errors.itemName}</p>
            )}
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              prefix="$"
              min={0}
              placeholder="349.00"
              value={form.price === 0 ? "" : String(form.price)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setForm((p) => ({ ...p, price: isNaN(v) ? 0 : v }));
                if (errors.price) setErrors((p) => ({ ...p, price: undefined }));
              }}
              className={errors.price ? "border-red-500/50" : ""}
            />
            {errors.price && (
              <p className="font-mono text-xs text-red-400">{errors.price}</p>
            )}
          </div>

          {/* Category + Urgency side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as Category }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryLabels) as Category[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <Select
                value={form.urgency}
                onValueChange={(v) => setForm((p) => ({ ...p, urgency: v as Urgency }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(urgencyLabels) as Urgency[]).map((u) => (
                    <SelectItem key={u} value={u}>
                      {urgencyLabels[u].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Urgency description */}
          <div className="border border-surface-border bg-surface p-3">
            <p className="font-mono text-xs text-[#666]">
              <span className="text-amber-400">{urgencyLabels[form.urgency].label}:</span>{" "}
              {urgencyLabels[form.urgency].desc}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Why do you want this?</Label>
            <Textarea
              id="reason"
              placeholder="Tell us what's driving this purchase..."
              value={form.reason}
              rows={3}
              onChange={(e) => {
                setForm((p) => ({ ...p, reason: e.target.value }));
                if (errors.reason) setErrors((p) => ({ ...p, reason: undefined }));
              }}
              className={errors.reason ? "border-red-500/50" : ""}
            />
            {errors.reason && (
              <p className="font-mono text-xs text-red-400">{errors.reason}</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="font-mono text-sm tracking-wider"
          >
            {submitting ? "Calculating..." : "Get My Verdict"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
