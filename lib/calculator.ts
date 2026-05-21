import type { FinancialProfile, PurchaseRequest, PurchaseResult, Verdict } from "@/types";

function getDaysUntilPayday(paydayDate: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  if (paydayDate >= currentDay) {
    return paydayDate - currentDay;
  }
  // Payday is next month
  return daysInMonth - currentDay + paydayDate;
}

export function calculateVerdict(
  profile: FinancialProfile,
  purchase: PurchaseRequest
): PurchaseResult {
  const safeToSpend = profile.currentBalance - profile.rentAmount - profile.monthlyBills - profile.savingsGoal;
  const safeToSpendAfter = safeToSpend - purchase.price;
  const daysUntilPayday = getDaysUntilPayday(profile.paydayDate);

  let score = 100;
  const deductions: { reason: string; points: number }[] = [];

  // Price vs safe-to-spend deductions
  if (purchase.price > safeToSpend) {
    score -= 40;
    deductions.push({ reason: "Price exceeds safe-to-spend", points: 40 });
  } else if (purchase.price > safeToSpend * 0.7) {
    score -= 20;
    deductions.push({ reason: "Price is >70% of safe-to-spend", points: 20 });
  } else if (purchase.price > safeToSpend * 0.4) {
    score -= 10;
    deductions.push({ reason: "Price is >40% of safe-to-spend", points: 10 });
  }

  // Rent due deductions
  if (profile.rentDueInDays <= 5) {
    score -= 15;
    deductions.push({ reason: `Rent due in ${profile.rentDueInDays} days`, points: 15 });
  } else if (profile.rentDueInDays <= 10) {
    score -= 5;
    deductions.push({ reason: `Rent due in ${profile.rentDueInDays} days`, points: 5 });
  }

  // Payday distance deductions
  if (daysUntilPayday > 20) {
    score -= 10;
    deductions.push({ reason: "Payday more than 20 days away", points: 10 });
  } else if (daysUntilPayday > 10) {
    score -= 5;
    deductions.push({ reason: "Payday more than 10 days away", points: 5 });
  }

  // Urgency deductions
  if (purchase.urgency === "impulse") {
    score -= 15;
    deductions.push({ reason: "Impulse purchase", points: 15 });
  } else if (purchase.urgency === "nice-to-have") {
    score -= 5;
    deductions.push({ reason: "Nice-to-have purchase", points: 5 });
  }

  score = Math.max(0, score);

  let verdict: Verdict;
  if (score >= 75) verdict = "BUY";
  else if (score >= 45) verdict = "WAIT";
  else verdict = "AVOID";

  const explanation = buildExplanation(verdict, score, safeToSpend, purchase, daysUntilPayday, profile);
  const { pros, cons } = buildProsAndCons(verdict, score, safeToSpend, purchase, daysUntilPayday, profile);
  const alternatives = buildAlternatives(verdict, purchase, safeToSpend, daysUntilPayday, profile);

  return {
    verdict,
    score,
    safeToSpend,
    safeToSpendAfter,
    daysUntilPayday,
    explanation,
    pros,
    cons,
    alternatives,
    deductions,
  };
}

function buildExplanation(
  verdict: Verdict,
  score: number,
  safeToSpend: number,
  purchase: PurchaseRequest,
  daysUntilPayday: number,
  profile: FinancialProfile
): string {
  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (verdict === "BUY") {
    if (purchase.urgency === "essential") {
      return `This is a necessary purchase and your finances can handle it comfortably. With ${fmt(safeToSpend)} available after covering rent, bills, and savings — ${fmt(purchase.price)} keeps you well within your safe zone. Payday is ${daysUntilPayday} days out, so timing works in your favour.`;
    }
    return `Your finances are in solid shape for this. At ${fmt(safeToSpend)} safe-to-spend, buying ${purchase.itemName} for ${fmt(purchase.price)} leaves you with ${fmt(safeToSpend - purchase.price)} — enough buffer to stay comfortable. Go for it.`;
  }

  if (verdict === "WAIT") {
    if (safeToSpend - purchase.price < 0) {
      return `The numbers are tight. This ${fmt(purchase.price)} purchase would push you ${fmt(Math.abs(safeToSpend - purchase.price))} past your safe-to-spend limit. With payday ${daysUntilPayday} days away, waiting gives you more breathing room and avoids dipping into reserved funds.`;
    }
    return `Possible, but not ideal timing. You have ${fmt(safeToSpend)} safe-to-spend, and ${purchase.itemName} takes a significant chunk of it. ${daysUntilPayday <= 14 ? `Payday is ${daysUntilPayday} days out — a short wait improves your position considerably.` : `Consider waiting for a better moment or finding a deal.`}`;
  }

  // AVOID
  if (safeToSpend <= 0) {
    return `Your safe-to-spend is ${fmt(safeToSpend)} — meaning your current balance barely covers rent, bills, and savings commitments. Buying ${purchase.itemName} for ${fmt(purchase.price)} right now would put you in a genuinely risky financial position.`;
  }
  return `This purchase doesn't add up right now. ${fmt(purchase.price)} against a ${fmt(safeToSpend)} safe-to-spend is too steep, especially with ${daysUntilPayday} days until payday${profile.rentDueInDays <= 10 ? ` and rent due in ${profile.rentDueInDays} days` : ""}. Protect your financial cushion.`;
}

function buildProsAndCons(
  verdict: Verdict,
  score: number,
  safeToSpend: number,
  purchase: PurchaseRequest,
  daysUntilPayday: number,
  profile: FinancialProfile
): { pros: string[]; cons: string[] } {
  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const pros: string[] = [];
  const cons: string[] = [];

  // Pros
  if (safeToSpend - purchase.price > 0) {
    pros.push(`Leaves you with ${fmt(safeToSpend - purchase.price)} safe-to-spend`);
  }
  if (purchase.urgency === "essential") {
    pros.push("It's a necessary purchase, not a discretionary one");
  }
  if (daysUntilPayday <= 7) {
    pros.push(`Payday refills your balance in just ${daysUntilPayday} days`);
  }
  if (purchase.price <= safeToSpend * 0.3) {
    pros.push("Low relative cost — a small fraction of your available funds");
  }
  if (verdict === "BUY") {
    pros.push("Your savings goal and bills are fully covered regardless");
  }
  if (purchase.category === "tech" || purchase.category === "other") {
    pros.push("Could provide lasting utility beyond a single use");
  }

  // Cons
  if (purchase.price > safeToSpend) {
    cons.push(`Price exceeds safe-to-spend by ${fmt(purchase.price - safeToSpend)}`);
  }
  if (purchase.urgency === "impulse") {
    cons.push("Impulse purchases often feel less satisfying within a week");
  }
  if (daysUntilPayday > 15) {
    cons.push(`${daysUntilPayday} days until next payday — long time to stretch funds`);
  }
  if (profile.rentDueInDays <= 7) {
    cons.push(`Rent due in ${profile.rentDueInDays} days — cash is already committed`);
  }
  if (purchase.price > safeToSpend * 0.5) {
    cons.push("Takes a large share of your discretionary budget");
  }
  if (verdict === "AVOID" || verdict === "WAIT") {
    cons.push("Reduces your financial buffer during an uncertain period");
  }
  if (purchase.category === "fashion") {
    cons.push("Fashion purchases depreciate quickly in resale value");
  }

  // Ensure at least 2 of each
  if (pros.length === 0) pros.push("Purchase fulfils an expressed need or want");
  if (pros.length === 1) pros.push("You've thought about it before acting");
  if (cons.length === 0) cons.push("Opportunity cost — that money could compound in savings");
  if (cons.length === 1) cons.push("Every unplanned purchase erodes your financial runway");

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 4) };
}

function buildAlternatives(
  verdict: Verdict,
  purchase: PurchaseRequest,
  safeToSpend: number,
  daysUntilPayday: number,
  profile: FinancialProfile
): string[] {
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const alts: string[] = [];

  // Wait until payday
  if (daysUntilPayday > 0 && daysUntilPayday <= 30) {
    alts.push(`Wait ${daysUntilPayday} day${daysUntilPayday !== 1 ? "s" : ""} until payday — same item, zero financial stress`);
  }

  // Weekly savings plan
  const weeksNeeded = Math.ceil(purchase.price / (profile.monthlyIncome * 0.1 / 4));
  if (weeksNeeded >= 2) {
    const weeklyAmount = Math.ceil(purchase.price / weeksNeeded);
    alts.push(`Set aside ${fmt(weeklyAmount)}/week for ${weeksNeeded} weeks — budget for it deliberately`);
  }

  // Secondhand option
  if (["tech", "fashion", "other"].includes(purchase.category)) {
    const secondhandPrice = Math.round(purchase.price * 0.6);
    alts.push(`Find it secondhand or refurbished — often ${fmt(purchase.price - secondhandPrice)} cheaper for the same item`);
  }

  // Price drop wait
  if (purchase.category === "tech" || purchase.category === "fashion") {
    alts.push("Set a price alert and buy when it drops 15–20% — patience pays off");
  }

  // Trade or borrow
  if (purchase.category === "tech" || purchase.category === "travel") {
    alts.push("Borrow, rent, or share for one-time needs before committing to buy");
  }

  // Add to a wishlist
  if (purchase.urgency === "impulse") {
    alts.push("Add it to a 30-day wishlist — if you still want it next month, it's not impulse");
  }

  // Generic savings
  if (alts.length < 3) {
    alts.push(`Put ${fmt(Math.min(purchase.price / 4, 50))}/week into a sub-savings account earmarked for this`);
  }

  return alts.slice(0, 4);
}
