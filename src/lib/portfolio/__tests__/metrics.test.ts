import { computePortfolioMetrics, getCorrelation } from '../metrics';
import { getInstrumentByTicker } from '@/lib/data/instruments';
import type { AssetClass } from '@/lib/data/instruments';
import type { EnrichedAllocation } from '../metrics';

jest.mock('@/lib/data/instruments');

const mockGet = getInstrumentByTicker as jest.MockedFunction<typeof getInstrumentByTicker>;

function mkAlloc(ticker: string, weight: number): EnrichedAllocation {
  return {
    asset_class: '',
    sub_class: null,
    instrument_name: ticker,
    instrument_ticker: ticker,
    weight,
    expected_return: null,
    description: null,
    suggested_account: null,
    mer: null,
    currency: null,
    isin: null,
  };
}

function mockInstrument(
  assetClass: AssetClass,
  expectedReturn: number,
  volatility: number,
  mer = 0
) {
  return { asset_class: assetClass, expected_return: expectedReturn, volatility, mer };
}

describe('getCorrelation', () => {
  it('returns 1 for self-correlation on every known class', () => {
    expect(getCorrelation('Actions canadiennes', 'Actions canadiennes')).toBe(1);
    expect(getCorrelation('Liquidités', 'Liquidités')).toBe(1);
    expect(getCorrelation('Or / Commodités', 'Or / Commodités')).toBe(1);
  });

  it('is symmetric: ρ(A,B) === ρ(B,A)', () => {
    const ab = getCorrelation('Actions américaines', 'Obligations canadiennes');
    const ba = getCorrelation('Obligations canadiennes', 'Actions américaines');
    expect(ab).toBe(ba);
    expect(getCorrelation('Immobilier (REITs)', 'Or / Commodités')).toBe(
      getCorrelation('Or / Commodités', 'Immobilier (REITs)')
    );
  });

  it('returns the correct tabular value for known pairs', () => {
    // US equities vs CA bonds = -0.10 (from CORRELATION_MATRIX)
    expect(getCorrelation('Actions américaines', 'Obligations canadiennes')).toBe(-0.10);
    // CA equities vs US equities = 0.78
    expect(getCorrelation('Actions canadiennes', 'Actions américaines')).toBe(0.78);
  });

  it('returns 0 when one side is an unknown class', () => {
    const unknown = 'Unknown Asset' as AssetClass;
    expect(getCorrelation(unknown, 'Actions canadiennes')).toBe(0);
    expect(getCorrelation('Actions canadiennes', unknown)).toBe(0);
  });

  it('returns 1 when both sides are the same unknown class', () => {
    const unknown = 'Unknown Asset' as AssetClass;
    expect(getCorrelation(unknown, unknown)).toBe(1);
  });
});

describe('computePortfolioMetrics', () => {
  beforeEach(() => {
    mockGet.mockReset();
    // Default: return undefined so fallbacks kick in (vol=5, return=4, mer=0, class=Liquidités)
    mockGet.mockReturnValue(undefined);
  });

  it('returns zeros for an empty allocation list', () => {
    const result = computePortfolioMetrics([]);
    expect(result.expected_return).toBe(0);
    expect(result.volatility).toBe(0);
    expect(result.sharpe_ratio).toBe(0);
  });

  it('computes net return = gross return − MER', () => {
    // 8% gross, 0.20% MER → net = 7.8%
    mockGet.mockReturnValue(mockInstrument('Liquidités', 8, 0, 0.20) as never);
    const result = computePortfolioMetrics([mkAlloc('TEST', 100)]);
    expect(result.expected_return).toBe(7.8);
  });

  it('returns sharpe_ratio = 0 when volatility is 0', () => {
    mockGet.mockReturnValue(mockInstrument('Liquidités', 4, 0, 0) as never);
    const result = computePortfolioMetrics([mkAlloc('CASH', 100)]);
    expect(result.volatility).toBe(0);
    expect(result.sharpe_ratio).toBe(0);
  });

  it('100% liquidités → very low volatility (< 5%)', () => {
    mockGet.mockReturnValue(mockInstrument('Liquidités', 4, 1, 0) as never);
    const result = computePortfolioMetrics([mkAlloc('CASH', 100)]);
    expect(result.volatility).toBeLessThan(5);
  });

  it('100% actions américaines → high volatility (> 10%)', () => {
    mockGet.mockReturnValue(mockInstrument('Actions américaines', 9, 18, 0.07) as never);
    const result = computePortfolioMetrics([mkAlloc('XUU.TO', 100)]);
    expect(result.volatility).toBeGreaterThan(10);
  });

  it('splits weight across two asset classes and uses their correlation', () => {
    mockGet.mockImplementation((ticker: string) => {
      if (ticker === 'EQ') return mockInstrument('Actions américaines', 9, 18, 0) as never;
      if (ticker === 'BD') return mockInstrument('Obligations canadiennes', 3, 5, 0) as never;
      return undefined;
    });
    // 50/50 blend: should have lower vol than pure equities
    const result = computePortfolioMetrics([mkAlloc('EQ', 50), mkAlloc('BD', 50)]);
    const pureEquity = computePortfolioMetrics([mkAlloc('EQ', 100)]);
    expect(result.volatility).toBeLessThan(pureEquity.volatility);
  });
});
