import type { RiskProfile } from '@/types/database';
import type { AssetClass } from '@/lib/data/instruments';

export interface AssetClassRange {
  min: number;
  max: number;
}

export interface PortfolioConstraints {
  equity_max: number;
  fixed_income_min: number;
  holdings_min: number;
  holdings_max: number;
  position_max: number;
  asset_class_ranges: Partial<Record<AssetClass, AssetClassRange>>;
}

export const PROFILE_CONSTRAINTS: Record<RiskProfile, PortfolioConstraints> = {
  'très_conservateur': {
    equity_max: 25,
    fixed_income_min: 60,
    holdings_min: 4,
    holdings_max: 8,
    position_max: 40,
    asset_class_ranges: {
      'Actions canadiennes': { min: 0, max: 15 },
      'Actions américaines': { min: 0, max: 10 },
      'Actions internationales': { min: 0, max: 5 },
      'Actions marchés émergents': { min: 0, max: 0 },
      'Obligations canadiennes': { min: 40, max: 70 },
      'Obligations mondiales': { min: 0, max: 20 },
      'Immobilier (REITs)': { min: 0, max: 5 },
      'Or / Commodités': { min: 0, max: 5 },
      'Liquidités': { min: 5, max: 30 },
    },
  },
  'conservateur': {
    equity_max: 40,
    fixed_income_min: 45,
    holdings_min: 5,
    holdings_max: 10,
    position_max: 35,
    asset_class_ranges: {
      'Actions canadiennes': { min: 5, max: 20 },
      'Actions américaines': { min: 0, max: 15 },
      'Actions internationales': { min: 0, max: 10 },
      'Actions marchés émergents': { min: 0, max: 5 },
      'Obligations canadiennes': { min: 30, max: 55 },
      'Obligations mondiales': { min: 0, max: 20 },
      'Immobilier (REITs)': { min: 0, max: 10 },
      'Or / Commodités': { min: 0, max: 5 },
      'Liquidités': { min: 0, max: 20 },
    },
  },
  'modéré': {
    equity_max: 65,
    fixed_income_min: 25,
    holdings_min: 5,
    holdings_max: 12,
    position_max: 30,
    asset_class_ranges: {
      'Actions canadiennes': { min: 10, max: 25 },
      'Actions américaines': { min: 10, max: 30 },
      'Actions internationales': { min: 5, max: 15 },
      'Actions marchés émergents': { min: 0, max: 10 },
      'Obligations canadiennes': { min: 15, max: 35 },
      'Obligations mondiales': { min: 0, max: 15 },
      'Immobilier (REITs)': { min: 0, max: 10 },
      'Or / Commodités': { min: 0, max: 10 },
      'Liquidités': { min: 0, max: 10 },
    },
  },
  'croissance': {
    equity_max: 85,
    fixed_income_min: 10,
    holdings_min: 6,
    holdings_max: 14,
    position_max: 25,
    asset_class_ranges: {
      'Actions canadiennes': { min: 10, max: 30 },
      'Actions américaines': { min: 15, max: 40 },
      'Actions internationales': { min: 5, max: 20 },
      'Actions marchés émergents': { min: 0, max: 15 },
      'Obligations canadiennes': { min: 5, max: 20 },
      'Obligations mondiales': { min: 0, max: 10 },
      'Immobilier (REITs)': { min: 0, max: 10 },
      'Or / Commodités': { min: 0, max: 10 },
      'Liquidités': { min: 0, max: 5 },
    },
  },
  'agressif': {
    equity_max: 100,
    fixed_income_min: 0,
    holdings_min: 6,
    holdings_max: 15,
    position_max: 25,
    asset_class_ranges: {
      'Actions canadiennes': { min: 10, max: 30 },
      'Actions américaines': { min: 20, max: 50 },
      'Actions internationales': { min: 5, max: 25 },
      'Actions marchés émergents': { min: 0, max: 20 },
      'Obligations canadiennes': { min: 0, max: 10 },
      'Obligations mondiales': { min: 0, max: 10 },
      'Immobilier (REITs)': { min: 0, max: 15 },
      'Or / Commodités': { min: 0, max: 10 },
      'Liquidités': { min: 0, max: 5 },
    },
  },
};

export function getConstraintsForProfile(profile: RiskProfile): PortfolioConstraints {
  return PROFILE_CONSTRAINTS[profile];
}

export function getConstraintsSummaryForPrompt(profile: RiskProfile): string {
  const c = PROFILE_CONSTRAINTS[profile];

  let summary = `## Contraintes pour le profil "${profile}"\n`;
  summary += `- Équité maximum: ${c.equity_max}%\n`;
  summary += `- Revenu fixe minimum: ${c.fixed_income_min}%\n`;
  summary += `- Nombre de positions: ${c.holdings_min}-${c.holdings_max}\n`;
  summary += `- Poids maximum par position: ${c.position_max}%\n\n`;
  summary += `### Plages par classe d'actif\n`;
  summary += '| Classe | Min | Max |\n';
  summary += '|--------|-----|-----|\n';

  for (const [assetClass, range] of Object.entries(c.asset_class_ranges)) {
    summary += `| ${assetClass} | ${range.min}% | ${range.max}% |\n`;
  }

  return summary;
}
