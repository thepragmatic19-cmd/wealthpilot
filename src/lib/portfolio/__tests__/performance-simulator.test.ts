import { simulatePerformance } from '../performance-simulator';
import type { Transaction } from '@/types/database';

// Fix the current date so the timeline is deterministic.
// Use mid-day timestamps to avoid UTC→local timezone edge cases
// (e.g. '2024-03-01T00:00:00Z' becomes Feb 29 in UTC-5 timezones).
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-03-15T12:00:00'));
});

afterAll(() => {
  jest.useRealTimers();
});

function mkTx(
  type: 'achat' | 'cotisation' | 'vente' | 'dividende' | 'rééquilibrage',
  amount: number,
  date: string
): Transaction {
  return { type, amount, executed_at: date } as unknown as Transaction;
}

describe('simulatePerformance', () => {
  it('returns [] for an empty transaction list', () => {
    expect(simulatePerformance([], 7)).toEqual([]);
  });

  it('returns exactly 1 data point for a transaction in the current month', () => {
    // Same month as mocked "now" (2024-03-15) → startMonth === endMonth → early-return path
    const txs = [mkTx('achat', 1000, '2024-03-15T12:00:00')];
    const result = simulatePerformance(txs, 7);
    expect(result).toHaveLength(1);
    expect(result[0].capitalInvesti).toBe(1000);
    expect(result[0].valeurEstimee).toBe(1000);
  });

  it('produces compound growth across multiple months', () => {
    // Jan 15 → startMonth = Jan 2024; now = Mar 15 → endMonth = Mar 2024 → 3 points
    const txs = [mkTx('achat', 1200, '2024-01-15T12:00:00')];
    const result = simulatePerformance(txs, 12); // 12% annual = 1%/month

    expect(result).toHaveLength(3);

    // Jan: initial deposit applied, no prior value
    expect(result[0].capitalInvesti).toBe(1200);
    expect(result[0].valeurEstimee).toBe(1200);

    // Feb: 1200 × 1.01 = 1212
    expect(result[1].valeurEstimee).toBe(Math.round(1200 * 1.01));

    // Mar: 1212 × 1.01 ≈ 1224
    expect(result[2].valeurEstimee).toBe(Math.round(1200 * 1.01 * 1.01));
  });

  it('vente reduces capitalInvesti', () => {
    const txs = [
      mkTx('achat', 1000, '2024-01-15T12:00:00'),
      mkTx('vente', 400, '2024-02-15T12:00:00'),
    ];
    const result = simulatePerformance(txs, 7);
    // Feb capitalInvesti = 1000 − 400 = 600
    expect(result[1].capitalInvesti).toBe(600);
  });

  it('dividende does not affect capitalInvesti but increases valeurEstimee', () => {
    const txs = [
      mkTx('achat', 1000, '2024-01-15T12:00:00'),
      mkTx('dividende', 50, '2024-02-15T12:00:00'),
    ];
    // 0% expected return → growth = 0, isolates the dividend effect
    const result = simulatePerformance(txs, 0);

    // capitalInvesti is NOT affected by dividends
    expect(result[1].capitalInvesti).toBe(1000);

    // valeurEstimee grows by exactly the dividend amount (0% growth)
    expect(result[1].valeurEstimee).toBe(result[0].valeurEstimee + 50);
  });

  it('rééquilibrage is neutral — identical results with or without it', () => {
    const withoutRebalance = simulatePerformance(
      [mkTx('achat', 1000, '2024-01-15T12:00:00')],
      7
    );
    const withRebalance = simulatePerformance(
      [
        mkTx('achat', 1000, '2024-01-15T12:00:00'),
        mkTx('rééquilibrage', 500, '2024-02-15T12:00:00'), // non-zero but neutral
      ],
      7
    );

    expect(withRebalance).toHaveLength(withoutRebalance.length);
    expect(withRebalance[0]).toEqual(withoutRebalance[0]);
    expect(withRebalance[1].capitalInvesti).toBe(withoutRebalance[1].capitalInvesti);
    expect(withRebalance[1].valeurEstimee).toBe(withoutRebalance[1].valeurEstimee);
  });

  it('benchmark always grows at 7%/yr regardless of expectedReturn', () => {
    const txs = [mkTx('achat', 1000, '2024-01-15T12:00:00')];

    const result20 = simulatePerformance(txs, 20);
    const result0 = simulatePerformance(txs, 0);

    // Benchmark column must be identical for any expectedReturn
    expect(result20.map((p) => p.benchmark)).toEqual(result0.map((p) => p.benchmark));

    // Verify 7%/12 monthly compounding from Jan → Feb
    const monthlyRate = 7 / 100 / 12;
    expect(result20[1].benchmark).toBe(Math.round(result20[0].benchmark * (1 + monthlyRate)));
  });
});
