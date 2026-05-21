"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveProfile, loadProfile } from "@/lib/storage";
import type { FinancialProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";

const defaultProfile: FinancialProfile = {
  monthlyIncome: 0,
  currentBalance: 0,
  rentAmount: 0,
  rentDueInDays: 0,
  monthlyBills: 0,
  savingsGoal: 0,
  paydayDate: 1,
};

type FieldKey = keyof FinancialProfile;

const fields: {
  key: FieldKey;
  label: string;
  hint: string;
  prefix?: string;
  min?: number;
  max?: number;
  placeholder: string;
}[] = [
  {
    key: "monthlyIncome",
    label: "Monthly Income",
    hint: "Your total take-home pay per month after tax.",
    prefix: "$",
    min: 0,
    placeholder: "3500",
  },
  {
    key: "currentBalance",
    label: "Current Balance",
    hint: "What's in your bank account right now.",
    prefix: "$",
    min: 0,
    placeholder: "1240",
  },
  {
    key: "rentAmount",
    label: "Rent / Mortgage",
    hint: "Your monthly rent or mortgage payment.",
    prefix: "$",
    min: 0,
    placeholder: "1100",
  },
  {
    key: "rentDueInDays",
    label: "Rent Due In",
    hint: "How many days until your next rent payment is due.",
    min: 0,
    max: 31,
    placeholder: "12",
  },
  {
    key: "monthlyBills",
    label: "Monthly Bills",
    hint: "Combined total of all recurring bills (utilities, subscriptions, insurance, etc.).",
    prefix: "$",
    min: 0,
    placeholder: "350",
  },
  {
    key: "savingsGoal",
    label: "Monthly Savings Goal",
    hint: "Amount you want to protect and move to savings each month.",
    prefix: "$",
    min: 0,
    placeholder: "200",
  },
  {
    key: "paydayDate",
    label: "Payday (Day of Month)",
    hint: "Which day of the month do you get paid? (1–31)",
    min: 1,
    max: 31,
    placeholder: "15",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FinancialProfile>(defaultProfile);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const existing = loadProfile();
    if (existing) {
      setForm(existing);
      setIsReturning(true);
    }
  }, []);

  function handleChange(key: FieldKey, value: string) {
    const num = parseFloat(value);
    setForm((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<FieldKey, string>> = {};
    if (form.monthlyIncome <= 0) newErrors.monthlyIncome = "Income must be greater than 0";
    if (form.currentBalance < 0) newErrors.currentBalance = "Balance cannot be negative";
    if (form.rentAmount < 0) newErrors.rentAmount = "Rent cannot be negative";
    if (form.rentDueInDays < 0 || form.rentDueInDays > 31) newErrors.rentDueInDays = "Must be 0–31 days";
    if (form.monthlyBills < 0) newErrors.monthlyBills = "Bills cannot be negative";
    if (form.savingsGoal < 0) newErrors.savingsGoal = "Savings goal cannot be negative";
    if (form.paydayDate < 1 || form.paydayDate > 31) newErrors.paydayDate = "Must be between 1 and 31";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveProfile(form);
    router.push("/check");
  }

  const safeToSpend = form.currentBalance - form.rentAmount - form.monthlyBills - form.savingsGoal;

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
          Financial Profile
        </span>
        {isReturning && (
          <span className="font-mono text-xs text-[#555] ml-auto">Updating existing profile</span>
        )}
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1
            className="text-4xl font-serif text-[#e8e4d9] mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {isReturning ? "Update your finances" : "Set up your finances"}
          </h1>
          <p className="font-mono text-xs text-[#666] leading-relaxed">
            This is stored locally on your device. We use it to calculate your real safe-to-spend
            before evaluating any purchase.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>
                {field.label}
                {field.key === "rentDueInDays" && (
                  <span className="text-[#555] ml-1.5">days</span>
                )}
                {field.key === "paydayDate" && (
                  <span className="text-[#555] ml-1.5">of month</span>
                )}
              </Label>
              <Input
                id={field.key}
                type="number"
                prefix={field.prefix}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                value={form[field.key] === 0 ? "" : String(form[field.key])}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className={errors[field.key] ? "border-red-500/50 focus:border-red-400" : ""}
              />
              {errors[field.key] ? (
                <p className="font-mono text-xs text-red-400">{errors[field.key]}</p>
              ) : (
                <p className="font-mono text-xs text-[#555] flex items-start gap-1.5">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#444]" />
                  {field.hint}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="mt-10 border border-surface-border bg-surface p-5">
          <p className="font-mono text-xs text-[#555] uppercase tracking-widest mb-4">
            Live Calculation Preview
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#666]">Current balance</span>
              <span className="font-mono text-sm text-[#e8e4d9]">
                ${form.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#666]">— Rent / mortgage</span>
              <span className="font-mono text-sm text-red-400/70">
                −${form.rentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#666]">— Monthly bills</span>
              <span className="font-mono text-sm text-red-400/70">
                −${form.monthlyBills.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#666]">— Savings goal</span>
              <span className="font-mono text-sm text-red-400/70">
                −${form.savingsGoal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t border-surface-border pt-2 mt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-amber-400 uppercase tracking-wider">
                Safe-to-spend
              </span>
              <span
                className={`font-mono text-base font-semibold ${
                  safeToSpend >= 0 ? "text-verdict-buy" : "text-verdict-avoid"
                }`}
              >
                ${safeToSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <Button onClick={handleSubmit} className="font-mono text-sm tracking-wider">
            {isReturning ? "Save Changes" : "Continue to Purchase Check"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
