import { computeWeightedMer, computeAccountSummary } from '../helpers';
import type { PortfolioAllocation } from '@/types/database';

function mkAlloc(
  weight: number,
  mer: number | null,
  suggested_account: string | null = null
): PortfolioAllocation {
  return { weight, mer, suggested_account } as unknown as PortfolioAllocation;
}

describe('computeWeightedMer', () => {
  it('returns null for an empty list', () => {
    expect(computeWeightedMer([])).toBeNull();
  });

  it('returns null when no allocation has a MER value', () => {
    const allocs = [mkAlloc(50, null), mkAlloc(50, null)];
    expect(computeWeightedMer(allocs)).toBeNull();
  });

  it('computes correct weighted MER for a single allocation', () => {
    const allocs = [mkAlloc(100, 0.20)];
    expect(computeWeightedMer(allocs)).toBe('0.20');
  });

  it('computes correct weighted MER for mixed allocations', () => {
    // 60% at 0.20% + 40% at 0.10% → weighted = (12 + 4) / 100 = 0.16
    const allocs = [mkAlloc(60, 0.20), mkAlloc(40, 0.10)];
    expect(computeWeightedMer(allocs)).toBe('0.16');
  });

  it('ignores null-MER allocations in the weighted average', () => {
    // Only the 100%-weight alloc at 0.20% counts; the null one is excluded
    const allocs = [mkAlloc(100, 0.20), mkAlloc(50, null)];
    expect(computeWeightedMer(allocs)).toBe('0.20');
  });
});

describe('computeAccountSummary', () => {
  it('returns an empty object for an empty list', () => {
    expect(computeAccountSummary([])).toEqual({});
  });

  it('groups weights by suggested_account', () => {
    const allocs = [mkAlloc(60, null, 'CELI'), mkAlloc(40, null, 'REER')];
    const summary = computeAccountSummary(allocs);
    expect(summary['CELI']).toBe(60);
    expect(summary['REER']).toBe(40);
  });

  it('defaults to non_enregistré when suggested_account is null', () => {
    const allocs = [mkAlloc(100, null, null)];
    const summary = computeAccountSummary(allocs);
    expect(summary['non_enregistré']).toBe(100);
  });

  it('defaults to non_enregistré when suggested_account is an empty string', () => {
    const allocs = [mkAlloc(50, null, '')];
    const summary = computeAccountSummary(allocs);
    expect(summary['non_enregistré']).toBe(50);
  });

  it('aggregates multiple allocations under the same account type', () => {
    const allocs = [
      mkAlloc(30, null, 'CELI'),
      mkAlloc(20, null, 'CELI'),
      mkAlloc(50, null, 'REER'),
    ];
    const summary = computeAccountSummary(allocs);
    expect(summary['CELI']).toBe(50);
    expect(summary['REER']).toBe(50);
  });
});
