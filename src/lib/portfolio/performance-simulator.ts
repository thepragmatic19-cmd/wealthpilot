import type { Transaction } from "@/types/database";

export interface PerformanceDataPoint {
  date: string;       // "YYYY-MM" label
  capitalInvesti: number;
  valeurEstimee: number;
  benchmark: number;
}

/**
 * Simulates historical portfolio performance based on real transactions
 * and a deterministic expected return rate.
 *
 * - Capital investi = cumulative net inflows (achat + cotisation - vente)
 * - Valeur estimee = compounded growth at expectedReturn on existing value + flows
 * - Benchmark = same logic but at 7% annual
 */
export function simulatePerformance(
  transactions: Transaction[],
  expectedReturn: number // e.g. 7.5 for 7.5%
): PerformanceDataPoint[] {
  if (transactions.length === 0) return [];

  // Sort by executed_at ascending
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
  );

  const firstDate = new Date(sorted[0].executed_at);
  const now = new Date();

  // Build month-by-month timeline
  const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (startMonth >= endMonth) {
    // Only one month of data
    const flow = computeMonthFlows(sorted, startMonth);
    return [{
      date: formatMonth(startMonth),
      capitalInvesti: flow.netInflow,
      valeurEstimee: flow.netInflow,
      benchmark: flow.netInflow,
    }];
  }

  // Group transactions by month
  const monthlyFlows = new Map<string, { netInflow: number; dividends: number }>();
  for (const tx of sorted) {
    const d = new Date(tx.executed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyFlows.get(key) || { netInflow: 0, dividends: 0 };

    if (tx.type === "achat" || tx.type === "cotisation") {
      existing.netInflow += tx.amount;
    } else if (tx.type === "vente") {
      existing.netInflow -= tx.amount;
    } else if (tx.type === "dividende") {
      existing.dividends += tx.amount;
    }
    // rééquilibrage is neutral
    monthlyFlows.set(key, existing);
  }

  const monthlyReturn = expectedReturn / 100 / 12;
  const benchmarkMonthlyReturn = 7 / 100 / 12;

  const result: PerformanceDataPoint[] = [];
  let capitalInvesti = 0;
  let valeurEstimee = 0;
  let benchmark = 0;

  const current = new Date(startMonth);
  while (current <= endMonth) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    const flows = monthlyFlows.get(key) || { netInflow: 0, dividends: 0 };

    // Apply growth on existing value BEFORE adding new flows
    valeurEstimee = valeurEstimee * (1 + monthlyReturn);
    benchmark = benchmark * (1 + benchmarkMonthlyReturn);

    // Add flows
    capitalInvesti += flows.netInflow;
    valeurEstimee += flows.netInflow + flows.dividends;
    benchmark += flows.netInflow + flows.dividends;

    result.push({
      date: formatMonth(current),
      capitalInvesti: Math.round(capitalInvesti),
      valeurEstimee: Math.round(valeurEstimee),
      benchmark: Math.round(benchmark),
    });

    // Next month
    current.setMonth(current.getMonth() + 1);
  }

  return result;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("fr-CA", { year: "numeric", month: "short" });
}

function computeMonthFlows(
  transactions: Transaction[],
  month: Date
): { netInflow: number; dividends: number } {
  const y = month.getFullYear();
  const m = month.getMonth();
  let netInflow = 0;
  let dividends = 0;

  for (const tx of transactions) {
    const d = new Date(tx.executed_at);
    if (d.getFullYear() === y && d.getMonth() === m) {
      if (tx.type === "achat" || tx.type === "cotisation") {
        netInflow += tx.amount;
      } else if (tx.type === "vente") {
        netInflow -= tx.amount;
      } else if (tx.type === "dividende") {
        dividends += tx.amount;
      }
    }
  }

  return { netInflow, dividends };
}
