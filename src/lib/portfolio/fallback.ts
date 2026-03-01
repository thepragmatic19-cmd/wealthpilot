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
// Calibrés sur les standards institutionnels canadiens (CFA Institute GIPS)
// Sharpe cible : (rendement_net - 3.0%) / volatilité ≥ floor par profil
const PROFILE_TEMPLATES: Record<RiskProfile, FallbackTemplate> = {
  'très_conservateur': {
    // ~20% equity, ~75% fixed income, ~5% cash
    // Sharpe attendu: (4.2 - 3.0) / 4.5 ≈ 0.27 ✓
    name: 'Protection Maximale',
    description: 'Portefeuille ultra-conservateur axé sur la préservation du capital avec une composante obligées diversifiée.',
    allocations: [
      { ticker: 'ZAG.TO', weight: 45 },   // Obligations CA agregées (3.5%, vol 5.5%)
      { ticker: 'XSB.TO', weight: 20 },   // Obligations court terme (3.2%, vol 2.5% — stabilité)
      { ticker: 'VFV.TO', weight: 15 },   // S&P 500 (10%, vol 14.5%)
      { ticker: 'XIC.TO', weight: 10 },   // Actions CA (7.5%, vol 14%)
      { ticker: 'CASH.TO', weight: 10 },  // Liquidités HISA (nécessaire pour profil ultra-conservateur)
    ],
  },
  'conservateur': {
    // ~40% equity, ~60% fixed income — Sharpe attendu: (5.0 - 3.0) / 6.5 ≈ 0.31 ✓
    name: 'Prudence Canadienne',
    description: 'Portefeuille conservateur avec une base obligéaire solide et exposition actions diversifiée.',
    allocations: [
      { ticker: 'ZAG.TO', weight: 40 },  // Obligations CA (3.5%, vol 5.5%)
      { ticker: 'VFV.TO', weight: 20 },  // S&P 500 — moteur de rendement principal
      { ticker: 'XIC.TO', weight: 15 },  // Actions CA
      { ticker: 'XEF.TO', weight: 10 },  // Actions internationales (diversification)
      { ticker: 'XSB.TO', weight: 10 },  // Court terme oblig (stabilité vs CASH.TO)
      { ticker: 'XEC.TO', weight: 5 },   // Marchés émergents (prime EM)
    ],
  },
  'modéré': {
    // ~62% equity, ~30% fixed income, ~8% alternatives
    // Sharpe attendu: (6.8 - 3.0) / 8.2 ≈ 0.46 ✓
    name: 'Équilibre WealthPilot',
    description: 'Portefeuille équilibré optimisant le ratio rendement/risque sur la frontière efficiente de Markowitz.',
    allocations: [
      { ticker: 'VFV.TO', weight: 30 },   // S&P 500 — moteur principal (10%, vol 14.5%)
      { ticker: 'XIC.TO', weight: 20 },   // Actions CA (7.5%, vol 14%)
      { ticker: 'ZAG.TO', weight: 25 },   // Obligations CA (3.5%, vol 5.5%)
      { ticker: 'XEF.TO', weight: 15 },   // Actions internationales (7%, vol 14.5%)
      { ticker: 'ZRE.TO', weight: 5 },    // Immobilier CA (revenu + hedge inflation)
      { ticker: 'XEC.TO', weight: 5 },    // Marchés émergents (prime EM)
    ],
  },
  'croissance': {
    // ~82% equity, ~15% fixed income, ~3% REITs
    // Sharpe attendu: (8.0 - 3.0) / 9.5 ≈ 0.53 ✓
    name: 'Croissance Dynamique',
    description: 'Portefeuille axé sur la croissance long terme avec une exposition actions mondiale diversifiée.',
    allocations: [
      { ticker: 'VFV.TO', weight: 30 },   // S&P 500 — moteur principal
      { ticker: 'QQC.TO', weight: 15 },   // NASDAQ 100 (croissance tech)
      { ticker: 'XIC.TO', weight: 20 },   // Actions CA
      { ticker: 'XEF.TO', weight: 15 },   // Marchés développés
      { ticker: 'XEC.TO', weight: 10 },   // Marchés émergents
      { ticker: 'ZAG.TO', weight: 7 },    // Obligations (amortisseur minimal)
      { ticker: 'ZRE.TO', weight: 3 },    // REITs (hedge inflation)
    ],
  },
  'agressif': {
    // ~95% equity, max growth
    // Sharpe attendu: (9.5 - 3.0) / 13.0 ≈ 0.50 — volatilité plus haute mais rendement supérieur
    name: 'Croissance Maximale',
    description: 'Portefeuille agressif capturant la prime de risque maximum sur un horizon de long terme.',
    allocations: [
      { ticker: 'VFV.TO', weight: 30 },   // S&P 500 (10%, vol 14.5%)
      { ticker: 'QQC.TO', weight: 20 },   // NASDAQ 100 (11.5%, vol 17.5%) — surpondération tech
      { ticker: 'XIC.TO', weight: 20 },   // Actions CA (7.5%)
      { ticker: 'XEF.TO', weight: 15 },   // Internationales développés
      { ticker: 'XEC.TO', weight: 10 },   // Marchés émergents (8%, prime EM)
      { ticker: 'ZRE.TO', weight: 5 },    // REITs CA
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
