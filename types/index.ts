export interface FinancialProfile {
  monthlyIncome: number;
  currentBalance: number;
  rentAmount: number;
  rentDueInDays: number;
  monthlyBills: number;
  savingsGoal: number;
  paydayDate: number; // day of month
}

export type Category = "fashion" | "food" | "tech" | "travel" | "other";
export type Urgency = "essential" | "nice-to-have" | "impulse";
export type Verdict = "BUY" | "WAIT" | "AVOID";

export interface PurchaseRequest {
  itemName: string;
  price: number;
  category: Category;
  urgency: Urgency;
  reason: string;
}

export interface PurchaseResult {
  verdict: Verdict;
  score: number;
  safeToSpend: number;
  safeToSpendAfter: number;
  daysUntilPayday: number;
  explanation: string;
  pros: string[];
  cons: string[];
  alternatives: string[];
  deductions: { reason: string; points: number }[];
}
