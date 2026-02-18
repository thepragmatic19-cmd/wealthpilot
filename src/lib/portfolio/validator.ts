import { z } from 'zod';
import type { RiskProfile } from '@/types/database';
import { getInstrumentByTicker, getValidTickers } from '@/lib/data/instruments';
import { getConstraintsForProfile, type AssetClassRange } from '@/lib/portfolio/constraints';
import { computePortfolioMetrics, type EnrichedAllocation, type EnrichedPortfolio } from '@/lib/portfolio/metrics';

// Re-export shared types for downstream consumers
export type { EnrichedAllocation, EnrichedPortfolio } from '@/lib/portfolio/metrics';

// ============================================================
// ZOD SCHEMAS (v4 syntax)
// ============================================================

const AllocationSchema = z.object({
  asset_class: z.string(),
  sub_class: z.string().nullable().optional(),
  instrument_name: z.string(),
  instrument_ticker: z.string(),
  weight: z.number(),
  expected_return: z.number().optional(),
  description: z.string().optional(),
});

const PortfolioSchema = z.object({
  type: z.enum(['conservateur', 'suggéré', 'ambitieux']),
  name: z.string(),
  description: z.string().optional(),
  expected_return: z.number(),
  volatility: z.number(),
  sharpe_ratio: z.number(),
  max_drawdown: z.number(),
  total_mer: z.number().optional().nullable(),
  rationale: z.string().optional(),
  tax_strategy: z.string().optional().nullable(),
  stress_test: z.object({
    inflation_shock: z.string(),
    market_crash: z.string(),
    interest_rate_hike: z.string(),
  }).optional().nullable(),
  allocations: z.array(AllocationSchema),
});

const AIResponseSchema = z.object({
  portfolios: z.array(PortfolioSchema),
});

// ============================================================
// TYPES
// ============================================================

export interface ValidationWarning {
  portfolio_type: string;
  message: string;
}


export interface ValidationResult {
  valid: boolean;
  portfolios: EnrichedPortfolio[];
  warnings: ValidationWarning[];
  errors: string[];
}

// ============================================================
// EQUITY ASSET CLASSES (for constraint checking)
// ============================================================

const EQUITY_CLASSES = new Set([
  'Actions canadiennes',
  'Actions américaines',
  'Actions internationales',
  'Actions marchés émergents',
]);

const FIXED_INCOME_CLASSES = new Set([
  'Obligations canadiennes',
  'Obligations mondiales',
  'Liquidités',
]);

// ============================================================
// VALIDATION PIPELINE
// ============================================================

export function validateAndEnrichPortfolios(
  rawData: unknown,
  riskProfile: RiskProfile
): ValidationResult {
  const errors: string[] = [];
  const warnings: ValidationWarning[] = [];

  // Step 1: Schema validation
  const parseResult = AIResponseSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      valid: false,
      portfolios: [],
      warnings: [],
      errors: [`Schéma invalide: ${parseResult.error.message}`],
    };
  }

  const parsed = parseResult.data;

  // Step 2: Exactly 3 portfolios with correct types
  const types = new Set(parsed.portfolios.map((p) => p.type));
  if (parsed.portfolios.length !== 3) {
    errors.push(`Attendu 3 portefeuilles, reçu ${parsed.portfolios.length}`);
  }
  for (const expected of ['conservateur', 'suggéré', 'ambitieux'] as const) {
    if (!types.has(expected)) {
      errors.push(`Portefeuille de type "${expected}" manquant`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, portfolios: [], warnings, errors };
  }

  const validTickers = getValidTickers();
  const enrichedPortfolios: EnrichedPortfolio[] = [];

  for (const portfolio of parsed.portfolios) {
    // Step 3: Weight total = 100%
    const totalWeight = portfolio.allocations.reduce((sum, a) => sum + a.weight, 0);

    if (totalWeight < 98 || totalWeight > 102) {
      errors.push(
        `Portefeuille "${portfolio.type}": poids total ${totalWeight}% (attendu 100%)`
      );
      continue;
    }

    // Auto-normalize if between 98-102%
    const needsNormalization = totalWeight !== 100;
    const normalizedAllocations = needsNormalization
      ? normalizeWeights(portfolio.allocations)
      : portfolio.allocations;

    if (needsNormalization) {
      warnings.push({
        portfolio_type: portfolio.type,
        message: `Poids normalisé de ${totalWeight}% à 100%`,
      });
    }

    // Step 4: Valid tickers
    const invalidTickers = normalizedAllocations
      .map((a) => a.instrument_ticker)
      .filter((t) => !validTickers.has(t));

    if (invalidTickers.length > 0) {
      errors.push(
        `Portefeuille "${portfolio.type}": tickers invalides: ${invalidTickers.join(', ')}`
      );
      continue;
    }

    // Step 5: No duplicate tickers
    const tickerSet = new Set<string>();
    let hasDuplicate = false;
    for (const alloc of normalizedAllocations) {
      if (tickerSet.has(alloc.instrument_ticker)) {
        errors.push(
          `Portefeuille "${portfolio.type}": ticker dupliqué "${alloc.instrument_ticker}"`
        );
        hasDuplicate = true;
        break;
      }
      tickerSet.add(alloc.instrument_ticker);
    }
    if (hasDuplicate) continue;

    // Step 6: Constraint compliance (warnings only)
    checkConstraints(portfolio.type, normalizedAllocations, riskProfile, warnings);

    // Step 7: Enrich from instruments database
    const enrichedAllocations: EnrichedAllocation[] = normalizedAllocations.map(
      (alloc) => {
        const instrument = getInstrumentByTicker(alloc.instrument_ticker);
        return {
          asset_class: instrument?.asset_class || alloc.asset_class,
          sub_class: instrument?.sub_class || alloc.sub_class || null,
          instrument_name: instrument?.name || alloc.instrument_name,
          instrument_ticker: alloc.instrument_ticker,
          weight: alloc.weight,
          expected_return: instrument?.expected_return ?? alloc.expected_return ?? null,
          description: alloc.description || null,
          suggested_account: instrument?.preferred_account || null,
          mer: instrument?.mer ?? null,
          currency: instrument?.currency || null,
          isin: instrument?.isin || null,
        };
      }
    );

    // Step 8: Recalculate metrics using correlation-based volatility (CFA Sanity Check)
    const metrics = computePortfolioMetrics(enrichedAllocations);

    enrichedPortfolios.push({
      type: portfolio.type,
      name: portfolio.name,
      description: portfolio.description || null,
      ...metrics,
      total_mer: portfolio.total_mer ?? null,
      rationale: portfolio.rationale || null,
      tax_strategy: portfolio.tax_strategy || null,
      stress_test: portfolio.stress_test || null,
      allocations: enrichedAllocations,
    });
  }

  return {
    valid: errors.length === 0 && enrichedPortfolios.length === 3,
    portfolios: enrichedPortfolios,
    warnings,
    errors,
  };
}

// ============================================================
// HELPERS
// ============================================================

function normalizeWeights(
  allocations: z.infer<typeof AllocationSchema>[]
): z.infer<typeof AllocationSchema>[] {
  const total = allocations.reduce((sum, a) => sum + a.weight, 0);
  if (total === 0) return allocations;

  const factor = 100 / total;
  const normalized = allocations.map((a) => ({
    ...a,
    weight: Math.round(a.weight * factor * 10) / 10,
  }));

  // Fix rounding: adjust the largest position
  const newTotal = normalized.reduce((sum, a) => sum + a.weight, 0);
  const diff = Math.round((100 - newTotal) * 10) / 10;
  if (diff !== 0) {
    const largest = normalized.reduce((max, a) =>
      a.weight > max.weight ? a : max
    );
    largest.weight = Math.round((largest.weight + diff) * 10) / 10;
  }

  return normalized;
}

function checkConstraints(
  portfolioType: string,
  allocations: z.infer<typeof AllocationSchema>[],
  riskProfile: RiskProfile,
  warnings: ValidationWarning[]
): void {
  // Map portfolio type to the profile it should match
  const profiles: RiskProfile[] = [
    'très_conservateur',
    'conservateur',
    'modéré',
    'croissance',
    'agressif',
  ];
  const currentIdx = profiles.indexOf(riskProfile);

  let targetProfile: RiskProfile;
  if (portfolioType === 'conservateur') {
    targetProfile = profiles[Math.max(0, currentIdx - 1)];
  } else if (portfolioType === 'ambitieux') {
    targetProfile = profiles[Math.min(profiles.length - 1, currentIdx + 1)];
  } else {
    targetProfile = riskProfile;
  }

  const constraints = getConstraintsForProfile(targetProfile);

  // Group weights by asset class
  const classTotals: Record<string, number> = {};
  for (const alloc of allocations) {
    const instrument = getInstrumentByTicker(alloc.instrument_ticker);
    const assetClass = instrument?.asset_class || alloc.asset_class;
    classTotals[assetClass] = (classTotals[assetClass] || 0) + alloc.weight;
  }

  // Check equity max
  let equityTotal = 0;
  for (const [cls, weight] of Object.entries(classTotals)) {
    if (EQUITY_CLASSES.has(cls)) equityTotal += weight;
  }
  if (equityTotal > constraints.equity_max) {
    warnings.push({
      portfolio_type: portfolioType,
      message: `Équité ${equityTotal}% dépasse le max ${constraints.equity_max}%`,
    });
  }

  // Check fixed income min
  let fixedIncomeTotal = 0;
  for (const [cls, weight] of Object.entries(classTotals)) {
    if (FIXED_INCOME_CLASSES.has(cls)) fixedIncomeTotal += weight;
  }
  if (fixedIncomeTotal < constraints.fixed_income_min) {
    warnings.push({
      portfolio_type: portfolioType,
      message: `Revenu fixe ${fixedIncomeTotal}% sous le min ${constraints.fixed_income_min}%`,
    });
  }

  // Check holdings count
  if (allocations.length < constraints.holdings_min) {
    warnings.push({
      portfolio_type: portfolioType,
      message: `${allocations.length} positions, minimum ${constraints.holdings_min}`,
    });
  }
  if (allocations.length > constraints.holdings_max) {
    warnings.push({
      portfolio_type: portfolioType,
      message: `${allocations.length} positions, maximum ${constraints.holdings_max}`,
    });
  }

  // Check position max
  for (const alloc of allocations) {
    if (alloc.weight > constraints.position_max) {
      warnings.push({
        portfolio_type: portfolioType,
        message: `${alloc.instrument_ticker} à ${alloc.weight}% dépasse le max ${constraints.position_max}%`,
      });
    }
  }

  // Check asset class ranges
  for (const [assetClass, range] of Object.entries(
    constraints.asset_class_ranges
  )) {
    const actual = classTotals[assetClass] || 0;
    const { min, max } = range as AssetClassRange;
    if (actual < min) {
      warnings.push({
        portfolio_type: portfolioType,
        message: `${assetClass}: ${actual}% sous le min ${min}%`,
      });
    }
    if (actual > max) {
      warnings.push({
        portfolio_type: portfolioType,
        message: `${assetClass}: ${actual}% dépasse le max ${max}%`,
      });
    }
  }
}
