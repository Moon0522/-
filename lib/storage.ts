import type { FinancialProfile, PurchaseRequest, PurchaseResult } from "@/types";

const PROFILE_KEY = "canibuyit_profile";
const LAST_PURCHASE_KEY = "canibuyit_last_purchase";
const LAST_RESULT_KEY = "canibuyit_last_result";

export function saveProfile(profile: FinancialProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadProfile(): FinancialProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FinancialProfile;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
}

export function saveLastPurchase(purchase: PurchaseRequest): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_PURCHASE_KEY, JSON.stringify(purchase));
}

export function loadLastPurchase(): PurchaseRequest | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_PURCHASE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PurchaseRequest;
  } catch {
    return null;
  }
}

export function saveLastResult(result: PurchaseResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
}

export function loadLastResult(): PurchaseResult | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PurchaseResult;
  } catch {
    return null;
  }
}
