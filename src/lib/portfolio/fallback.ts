import type { RiskProfile } from '@/types/database';
import { getInstrumentByTicker } from '@/lib/data/instruments';
import { computePortfolioMetrics, type EnrichedPortfolio, type EnrichedAllocation } from '@/lib/portfolio/metrics';

// ============================================================
// DETERMINISTIC FALLBACK PORTFOLIOS
// ============================================================

interface FallbackAllocation {
  ticker: string;
  weight: number;
}

interface FallbackTemplate {
  name: string;
  description: string;
  allocations: FallbackAllocation[];
}

// Templates per risk profile for the "suggéré" portfolio
// Calibrés sur les standards des robo-advisors canadiens (Wealthsimple, Questwealth)
const PROFILE_TEMPLATES: Record<RiskProfile, FallbackTemplate> = {
  'très_conservateur': {
    // ~20% equity, ~80% fixed income/cash
    name: 'Protection Maximale',
    description: 'Portefeuille ultra-conservateur axé sur la préservation du capital.',
    allocations: [
      { ticker: 'ZAG.TO', weight: 45 },   // Obligations canadiennes agrégées
      { ticker: 'XSB.TO', weight: 20 },   // Obligations court terme (stabilité)
      { ticker: 'XIC.TO', weight: 10 },   // Actions canadiennes
      { ticker: 'VFV.TO', weight: 10 },   // S&P 500
      { ticker: 'CASH.TO', weight: 15 },  // Liquidités
    ],
  },
  'conservateur': {
    // ~35% equity, ~65% fixed income/cash
    name: 'Prudence Canadienne',
    description: 'Portefeuille conservateur avec une base obligataire solide.',
    allocations: [
      { ticker: 'ZAG.TO', weight: 40 },   // Obligations canadiennes
      { ticker: 'XIC.TO', weight: 15 },   // Actions canadiennes
      { ticker: 'VFV.TO', weight: 15 },   // S&P 500
      { ticker: 'VGAB.TO', weight: 10 },  // Obligations mondiales
      { ticker: 'CASH.TO', weight: 10 },  // Liquidités
      { ticker: 'XEF.TO', weight: 10 },   // Actions internationales
    ],
  },
  'modéré': {
    // ~60% equity, ~40% fixed income
    name: 'Équilibre WealthPilot',
    description: 'Portefeuille équilibré entre croissance et protection.',
    allocations: [
      { ticker: 'VFV.TO', weight: 25 },   // S&P 500
      { ticker: 'XIC.TO', weight: 20 },   // Actions canadiennes
      { ticker: 'ZAG.TO', weight: 25 },   // Obligations canadiennes
      { ticker: 'XEF.TO', weight: 10 },   // Actions internationales
      { ticker: 'ZRE.TO', weight: 5 },    // Immobilier canadien
      { ticker: 'XEC.TO', weight: 5 },    // Marchés émergents
      { ticker: 'CASH.TO', weight: 5 },   // Liquidités
      { ticker: 'CGL-C.TO', weight: 5 },  // Or (couverture)
    ],
  },
  'croissance': {
    // ~80% equity, ~20% fixed income
    name: 'Croissance Dynamique',
    description: 'Portefeuille axé sur la croissance à long terme.',
    allocations: [
      { ticker: 'VFV.TO', weight: 30 },   // S&P 500
      { ticker: 'XIC.TO', weight: 20 },   // Actions canadiennes
      { ticker: 'XEF.TO', weight: 15 },   // Actions internationales
      { ticker: 'QQC.TO', weight: 10 },   // NASDAQ 100
      { ticker: 'ZAG.TO', weight: 10 },   // Obligations canadiennes
      { ticker: 'XEC.TO', weight: 10 },   // Marchés émergents
      { ticker: 'ZRE.TO', weight: 5 },    // Immobilier canadien
    ],
  },
  'agressif': {
    // ~95% equity, ~5% fixed income
    name: 'Croissance Maximale',
    description: 'Portefeuille agressif pour maximiser le rendement à long terme.',
    allocations: [
      { ticker: 'VFV.TO', weight: 30 },   // S&P 500
      { ticker: 'XIC.TO', weight: 20 },   // Actions canadiennes
      { ticker: 'QQC.TO', weight: 15 },   // NASDAQ 100
      { ticker: 'XEF.TO', weight: 15 },   // Actions internationales
      { ticker: 'XEC.TO', weight: 10 },   // Marchés émergents
      { ticker: 'ZRE.TO', weight: 5 },    // Immobilier canadien
      { ticker: 'ZAG.TO', weight: 5 },    // Obligations (tampon)
    ],
  },
};

function buildEnrichedAllocation(
  ticker: string,
  weight: number
): EnrichedAllocation {
  const instrument = getInstrumentByTicker(ticker);
  return {
    asset_class: instrument?.asset_class || 'Liquidités',
    sub_class: instrument?.sub_class || null,
    instrument_name: instrument?.name || ticker,
    instrument_ticker: ticker,
    weight,
    expected_return: instrument?.expected_return ?? null,
    description: instrument?.name || null,
    suggested_account: instrument?.preferred_account || null,
    mer: instrument?.mer ?? null,
    currency: instrument?.currency || null,
    isin: instrument?.isin || null,
  };
}

function shiftProfile(
  profile: RiskProfile,
  direction: -1 | 0 | 1
): RiskProfile {
  const profiles: RiskProfile[] = [
    'très_conservateur',
    'conservateur',
    'modéré',
    'croissance',
    'agressif',
  ];
  const idx = profiles.indexOf(profile);
  const newIdx = Math.max(0, Math.min(profiles.length - 1, idx + direction));
  return profiles[newIdx];
}

export function generateFallbackPortfolios(
  riskProfile: RiskProfile
): EnrichedPortfolio[] {
  const variants: Array<{
    type: 'conservateur' | 'suggéré' | 'ambitieux';
    direction: -1 | 0 | 1;
    namePrefix: string;
  }> = [
    { type: 'conservateur', direction: -1, namePrefix: 'Prudence' },
    { type: 'suggéré', direction: 0, namePrefix: '' },
    { type: 'ambitieux', direction: 1, namePrefix: 'Ambition' },
  ];

  return variants.map(({ type, direction, namePrefix }) => {
    const targetProfile = shiftProfile(riskProfile, direction);
    const template = PROFILE_TEMPLATES[targetProfile];

    const allocations = template.allocations.map((a) =>
      buildEnrichedAllocation(a.ticker, a.weight)
    );

    const metrics = computePortfolioMetrics(allocations);
    
    // Compute total MER for fallback
    const totalMer = allocations.reduce((sum, a) => sum + (a.weight / 100) * (a.mer ?? 0), 0);

    const name =
      type === 'suggéré'
        ? template.name
        : `${namePrefix} — ${template.name}`;

    const rationale =
      type === 'conservateur'
        ? `Ce portefeuille est structuré selon une approche de préservation du capital ("Capital Preservation"). En réduisant l'exposition aux actions au profit de titres à revenu fixe de haute qualité, nous visons à minimiser la variance du portefeuille tout en maintenant un rendement supérieur à l'inflation. C'est une stratégie défensive adaptée à un horizon court terme ou une faible tolérance aux retraits importants.`
        : type === 'ambitieux'
        ? `Ce portefeuille adopte un biais de croissance agressive ("Aggressive Growth") en surpondérant les actions américaines et technologiques. L'objectif est de capturer la prime de risque maximale sur un horizon de long terme. La volatilité accrue est compensée par un potentiel de capitalisation nettement supérieur, visant une croissance réelle du patrimoine après impôts.`
        : `Ce portefeuille "Suggéré" est construit sur le principe de la Frontière Efficiente. Il maximise le rendement attendu pour votre niveau de risque spécifique en optimisant la corrélation entre les classes d'actifs. Nous utilisons une diversification globale pour réduire le risque spécifique tout en maintenant une exposition robuste aux moteurs de performance mondiaux.`;

    const taxStrategy = 
      type === 'conservateur'
        ? "Optimisation fiscale : Concentration des obligations (ZAG) dans le REER pour protéger les revenus d'intérêts de l'imposition immédiate. Utilisation du CELI pour les fonds d'actions afin de protéger les dividendes canadiens."
        : "Stratégie Asset Location : Placement prioritaire des ETFs US-listed (ex: VOO, VTI) dans le REER pour éliminer la retenue à la source de 15%. Allocation des actions de croissance au CELI pour maximiser l'abri fiscal sur les gains en capital à long terme.";

    return {
      type,
      name,
      description: template.description,
      ...metrics,
      total_mer: Math.round(totalMer * 100) / 100,
      rationale,
      tax_strategy: taxStrategy,
      stress_test: {
        inflation_shock: metrics.volatility > 12 ? "Impact modéré (protection via actions)" : "Impact négatif (érosion du rendement fixe)",
        market_crash: metrics.volatility > 12 ? "Correction potentielle de -25% à -35%" : "Baisse contenue de -10% à -15%",
        interest_rate_hike: "Sensibilité accrue sur les obligations à longue échéance (ZFL)",
      },
      allocations,
    };
  });
}
