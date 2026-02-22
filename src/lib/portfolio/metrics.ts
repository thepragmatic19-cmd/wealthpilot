import type { AssetClass } from '@/lib/data/instruments';
import { getInstrumentByTicker } from '@/lib/data/instruments';

// ============================================================
// SHARED TYPES (used by both validator.ts and fallback.ts)
// ============================================================

export interface EnrichedAllocation {
  asset_class: string;
  sub_class: string | null;
  instrument_name: string;
  instrument_ticker: string;
  weight: number;
  expected_return: number | null;
  description: string | null;
  suggested_account: string | null;
  mer: number | null;
  currency: string | null;
  isin: string | null;
}

export interface EnrichedPortfolio {
  type: string;
  name: string;
  description: string | null;
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  total_mer: number | null;
  rationale: string | null;
  tax_strategy: string | null;
  stress_test: {
    inflation_shock: string;
    market_crash: string;
    interest_rate_hike: string;
  } | null;
  allocations: EnrichedAllocation[];
}

// ============================================================
// CORRELATION MATRIX (between asset classes)
// Based on historical 10Y data from DFA/Vanguard research
// ============================================================

const ASSET_CLASS_ORDER: AssetClass[] = [
  'Actions canadiennes',
  'Actions américaines',
  'Actions internationales',
  'Actions marchés émergents',
  'Obligations canadiennes',
  'Obligations mondiales',
  'Immobilier (REITs)',
  'Or / Commodités',
  'Liquidités',
];

// Symmetric correlation matrix (row/column order matches ASSET_CLASS_ORDER)
const CORRELATION_MATRIX: number[][] = [
  // CA eq  US eq  Intl   EM     CA bd  Gl bd  REIT   Gold   Cash
  [ 1.00,  0.78,  0.75,  0.65,  0.05, -0.05,  0.55,  0.05,  0.00 ], // Actions canadiennes
  [ 0.78,  1.00,  0.85,  0.70, -0.10, -0.10,  0.60,  0.00,  0.00 ], // Actions américaines
  [ 0.75,  0.85,  1.00,  0.75, -0.05, -0.05,  0.55,  0.05,  0.00 ], // Actions internationales
  [ 0.65,  0.70,  0.75,  1.00, -0.05, -0.10,  0.50,  0.10,  0.00 ], // Actions marchés émergents
  [ 0.05, -0.10, -0.05, -0.05,  1.00,  0.80,  0.15,  0.25,  0.30 ], // Obligations canadiennes
  [-0.05, -0.10, -0.05, -0.10,  0.80,  1.00,  0.10,  0.30,  0.25 ], // Obligations mondiales
  [ 0.55,  0.60,  0.55,  0.50,  0.15,  0.10,  1.00,  0.10,  0.00 ], // Immobilier (REITs)
  [ 0.05,  0.00,  0.05,  0.10,  0.25,  0.30,  0.10,  1.00,  0.00 ], // Or / Commodités
  [ 0.00,  0.00,  0.00,  0.00,  0.30,  0.25,  0.00,  0.00,  1.00 ], // Liquidités
];

const assetClassIndex = new Map(ASSET_CLASS_ORDER.map((c, i) => [c, i]));

export function getCorrelation(a: AssetClass, b: AssetClass): number {
  const i = assetClassIndex.get(a);
  const j = assetClassIndex.get(b);
  if (i === undefined || j === undefined) return a === b ? 1 : 0;
  return CORRELATION_MATRIX[i][j];
}

/**
 * Compute portfolio metrics using correlation-based volatility (Markowitz).
 * Returns are net of weighted MER.
 */
export function computePortfolioMetrics(
  allocations: EnrichedAllocation[]
): { expected_return: number; volatility: number; sharpe_ratio: number; max_drawdown: number } {
  // Group weights and volatilities by asset class
  const classWeights = new Map<AssetClass, number>();
  const classVols = new Map<AssetClass, number>();
  let weightedReturn = 0;
  let weightedMer = 0;

  for (const alloc of allocations) {
    const instrument = getInstrumentByTicker(alloc.instrument_ticker);
    const w = alloc.weight / 100;
    const assetClass = (instrument?.asset_class ?? 'Liquidités') as AssetClass;
    const vol = instrument?.volatility ?? 5;

    weightedReturn += w * (instrument?.expected_return ?? 4);
    weightedMer += w * (instrument?.mer ?? 0);

    // Accumulate weight per asset class
    classWeights.set(assetClass, (classWeights.get(assetClass) ?? 0) + w);
    // Use weighted-average vol within the class
    const prevW = classWeights.get(assetClass)! - w;
    const prevVol = classVols.get(assetClass) ?? 0;
    classVols.set(
      assetClass,
      prevW + w > 0 ? (prevVol * prevW + vol * w) / (prevW + w) : vol
    );
  }

  // Net return after MER
  const netReturn = weightedReturn - weightedMer;

  // Correlation-based portfolio variance: Σ_i Σ_j w_i * w_j * σ_i * σ_j * ρ_ij
  let variance = 0;
  for (const [classA, wA] of classWeights) {
    const volA = classVols.get(classA) ?? 0;
    for (const [classB, wB] of classWeights) {
      const volB = classVols.get(classB) ?? 0;
      const corr = getCorrelation(classA, classB);
      variance += wA * wB * volA * volB * corr;
    }
  }

  const vol = Math.sqrt(Math.max(0, variance));
  const riskFreeRate = 3.0; // Taux directeur BdC ~3.0% (fév. 2026)
  const sharpe = vol > 0 ? (netReturn - riskFreeRate) / vol : 0;
  const maxDrawdown = vol * 2.5;

  return {
    expected_return: Math.round(netReturn * 10) / 10,
    volatility: Math.round(vol * 10) / 10,
    sharpe_ratio: Math.round(sharpe * 100) / 100,
    max_drawdown: Math.round(maxDrawdown * 10) / 10,
  };
}
