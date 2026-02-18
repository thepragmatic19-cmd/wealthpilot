import type { PortfolioAllocation } from "@/types/database";

export function computeWeightedMer(allocations: PortfolioAllocation[]): string | null {
  let totalWeight = 0;
  let weightedMer = 0;
  for (const alloc of allocations) {
    if (alloc.mer != null) {
      weightedMer += alloc.weight * alloc.mer;
      totalWeight += alloc.weight;
    }
  }
  if (totalWeight === 0) return null;
  return (weightedMer / totalWeight).toFixed(2);
}

export function computeAccountSummary(allocations: PortfolioAllocation[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const alloc of allocations) {
    const account = alloc.suggested_account || 'non_enregistré';
    summary[account] = (summary[account] || 0) + alloc.weight;
  }
  return summary;
}
