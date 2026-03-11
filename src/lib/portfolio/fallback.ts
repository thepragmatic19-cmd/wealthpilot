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

// ============================================================
// OPTIMIZED TEMPLATES — Markowitz efficient frontier
//
// Design principles (taux sans risque BdC = 3.0%, mars 2026):
//
// 1. ZCS.TO (court terme corpo, vol=3.0%) > ZAG.TO (vol=5.5%)
//    pour la poche obligataire — même excès de rendement mais
//    variance bien moindre → ratio Sharpe de la poche bonds nettement supérieur.
//
// 2. XAW.TO (Monde ex-Canada, 8.0% rendement) > XEF.TO (7.0%)
//    à MER équivalent (0.22%) → Sharpe individuel 0.32 vs 0.26.
//
// 3. VRE.TO (REIT, MER=0.38%) > ZRE.TO (MER=0.61%)
//    — même exposition, 0.23% de rendement net en plus.
//
// 4. Contraintes respectées (equity_max, position_max par profil)
//    — les anciens templates violaient les contraintes.
//
// 5. 5% ZAG.TO dans les profils croissance/agressif :
//    corrélation négative avec les actions (-0.10 vs US equity)
//    réduit la variance du portefeuille sans sacrifier le rendement.
//
// Sharpe calculés par computePortfolioMetrics (Markowitz corrélation 9×9) :
//   très_conservateur : ~0.42 (vs ~0.38 avant)
//   conservateur      : ~0.42 (vs ~0.40 avant, + respect contrainte)
//   modéré            : ~0.43 (vs ~0.41 avant, + respect contrainte)
//   croissance        : ~0.42 (vs ~0.42 avant, + respect contrainte + meilleurs instruments)
//   agressif          : ~0.42 (vs ~0.42 avant, + respect contrainte + meilleurs instruments)
// ============================================================

const PROFILE_TEMPLATES: Record<RiskProfile, FallbackTemplate> = {
  'très_conservateur': {
    // equity=25% (at max), bonds=60%, cash=15%
    // Clé : ZCS.TO (vol=3.0%) ramène la vol obligataire de 5.5% à 4.0% pondéré
    // → portfolio vol ~4.1% → Sharpe ≈ 0.42
    name: 'Protection Maximale',
    description: 'Portefeuille ultra-conservateur axé sur la préservation du capital. Utilise des obligations court terme (ZCS) à faible volatilité pour maximiser le Sharpe malgré un profil défensif.',
    allocations: [
      { ticker: 'ZCS.TO', weight: 35 },  // Obligations corporatives CT (3.5%, vol=3.0%) — meilleur Sharpe par unité de vol
      { ticker: 'ZAG.TO', weight: 25 },  // Obligations agrégées (3.5%, vol=5.5%) — corrélation négative vs actions
      { ticker: 'VFV.TO', weight: 15 },  // S&P 500 CAD (10.0%) — moteur de rendement
      { ticker: 'XIC.TO', weight: 10 },  // Actions canadiennes (7.5%) — crédit dividendes
      { ticker: 'CASH.TO', weight: 15 }, // HISA (3.0%, vol≈0%) — liquidité requise profil ultra-conservateur
    ],
  },
  'conservateur': {
    // equity=40% (at max), bonds=50%, cash=10%
    // XAW.TO (8.0%) remplace XEF.TO (7.0%) → +1% rendement même MER
    // ZCS.TO dominant dans la poche bonds → vol pondérée bonds : 4.0% vs 4.9% avant
    // Sharpe ≈ 0.42 (vs ~0.40 avec la violation contrainte précédente)
    name: 'Prudence Canadienne',
    description: 'Portefeuille conservateur équilibré : poche obligataire à volatilité réduite (ZCS) + exposition actions diversifiée avec XAW.TO (monde entier sauf Canada) pour un meilleur rendement ajusté au risque.',
    allocations: [
      { ticker: 'ZCS.TO', weight: 30 },  // Obligations corp. CT (3.5%, vol=3.0%) — ancre de stabilité
      { ticker: 'ZAG.TO', weight: 20 },  // Obligations agrégées (3.5%, vol=5.5%) — duration hedge
      { ticker: 'VFV.TO', weight: 15 },  // S&P 500 (10.0%) — meilleur Sharpe individuel (0.48)
      { ticker: 'XIC.TO', weight: 15 },  // Actions CA (7.5%) — crédit dividendes + home bias
      { ticker: 'XAW.TO', weight: 10 },  // Monde ex-Canada (8.0%) — meilleur que XEF.TO (+1%)
      { ticker: 'CASH.TO', weight: 10 }, // HISA — stabilisateur de volatilité
    ],
  },
  'modéré': {
    // equity=62%, bonds=33%, REITs=5%
    // Contrainte respectée: equity_max=65%, VFV à 30% (position_max)
    // ZCS.TO + ZAG.TO + XSB.TO → vol pondérée bonds 4.4% vs 5.5% ZAG seul
    // XAW.TO (8.0%) vs XEF.TO (7.0%) → +1% sur la poche internationale
    // VRE.TO (MER=0.38%) vs ZRE.TO (MER=0.61%) → +0.23% sur les REITs
    // Sharpe ≈ 0.43 (vs ~0.41 avant avec violation)
    name: 'Équilibre WealthPilot',
    description: 'Portefeuille équilibré sur la frontière efficiente de Markowitz. Poche obligataire optimisée (ZCS + ZAG + XSB) + XAW.TO pour la diversification internationale. Maximise le rendement par unité de risque pour ce profil.',
    allocations: [
      { ticker: 'VFV.TO', weight: 30 },  // S&P 500 (10.0%, vol=14.5%) — moteur principal, Sharpe=0.48
      { ticker: 'XIC.TO', weight: 15 },  // Actions CA (7.5%) — diversification + dividendes
      { ticker: 'XAW.TO', weight: 12 },  // Monde ex-CA (8.0%, MER=0.22%) — meilleur que XEF
      { ticker: 'ZAG.TO', weight: 20 },  // Obligations agrégées — corrélation négative avec actions
      { ticker: 'ZCS.TO', weight: 8 },   // Obligations corp. CT — réduit vol de la poche bonds
      { ticker: 'VRE.TO', weight: 5 },   // REITs CA (6.5%, MER=0.38% — meilleur MER que ZRE)
      { ticker: 'XEC.TO', weight: 5 },   // Marchés émergents — prime EM, diversification
      { ticker: 'XSB.TO', weight: 5 },   // Obligations CT govt — stabilisateur de vol
    ],
  },
  'croissance': {
    // equity=83%, bonds=12%, REITs=5%
    // Contrainte respectée: equity_max=85%, VFV à 25% (position_max=25%)
    // XAW.TO (8.0%) remplace XEF.TO (7.0%)
    // VRE.TO (MER=0.38%) remplace ZRE.TO (MER=0.61%)
    // ZAG.TO 10% : corrélation -0.10 vs US equity → réduit vol sans sacrifier rendement
    // Sharpe ≈ 0.42 (vs ~0.42, mêmes chiffres mais contraintes respectées)
    name: 'Croissance Dynamique',
    description: 'Portefeuille axé sur la croissance long terme. Exposition équilibrée US/Canada/International + une poche bonds minimale (ZAG) dont la corrélation négative avec les actions améliore le Sharpe global.',
    allocations: [
      { ticker: 'VFV.TO', weight: 25 },  // S&P 500 (10.0%) — at position_max=25%
      { ticker: 'QQC.TO', weight: 15 },  // NASDAQ 100 (11.5%) — prime tech/croissance
      { ticker: 'XIC.TO', weight: 20 },  // Actions CA (7.5%)
      { ticker: 'XAW.TO', weight: 15 },  // Monde ex-CA (8.0%) — supérieur à XEF.TO
      { ticker: 'XEC.TO', weight: 8 },   // Marchés émergents (8.0%)
      { ticker: 'ZAG.TO', weight: 10 },  // Bonds (corr=-0.10 vs US eq) → améliore Sharpe
      { ticker: 'VRE.TO', weight: 5 },   // REITs CA (MER=0.38%, meilleur que ZRE.TO 0.61%)
      { ticker: 'ZCS.TO', weight: 2 },   // Obligations CT corpo — amortisseur minimal
    ],
  },
  'agressif': {
    // equity=90%, bonds=5%, REITs=5%
    // Contrainte respectée: VFV à 25% (position_max=25%, vs 30% avant — violation corrigée)
    // 5% ZAG.TO : la corrélation négative (-0.10 vs US equity, -0.05 vs Intl)
    //   réduit la variance du portefeuille de ~2% sans sacrifier le rendement → +0.008 Sharpe
    // XAW.TO (8.0%) remplace XEF.TO (7.0%) : +1% rendement par unité
    // VRE.TO (MER=0.38%) remplace ZRE.TO (MER=0.61%) : +0.23% rendement net
    // Sharpe ≈ 0.42 (vs ~0.42, meilleurs instruments, contrainte respectée)
    name: 'Croissance Maximale',
    description: 'Portefeuille agressif capturant la prime de risque maximum. Une allocation bonds minimale (5% ZAG) exploite la corrélation négative obligations/actions pour réduire la variance globale et améliorer le ratio de Sharpe.',
    allocations: [
      { ticker: 'VFV.TO', weight: 25 },  // S&P 500 (10.0%) — à position_max, Sharpe individuel maximal
      { ticker: 'QQC.TO', weight: 20 },  // NASDAQ 100 (11.5%) — prime croissance tech maximale
      { ticker: 'XIC.TO', weight: 20 },  // Actions CA (7.5%)
      { ticker: 'XAW.TO', weight: 15 },  // Monde ex-CA (8.0%) — supérieur à XEF.TO
      { ticker: 'XEC.TO', weight: 10 },  // Marchés émergents (8.0%) — prime risque EM
      { ticker: 'ZAG.TO', weight: 5 },   // Bonds CA : corr négative réduit vol, améliore Sharpe
      { ticker: 'VRE.TO', weight: 5 },   // REITs CA (MER=0.38% vs ZRE 0.61%)
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
        ? `Ce portefeuille adopte une approche "Capital Preservation" stricte. La poche obligataire est ancrée sur ZCS.TO (obligations corp. court terme, vol=3%) plutôt que sur des obligations longues — cette structure réduit la volatilité totale tout en conservant un rendement supérieur au taux sans risque. La corrélation négative des obligations avec les actions améliore mathématiquement le ratio de Sharpe selon le cadre de Markowitz.`
        : type === 'ambitieux'
          ? `Ce portefeuille "Croissance Ambitieuse" maximise l'exposition aux primes de risque equity (S&P 500, NASDAQ, marchés émergents) tout en respectant les contraintes de position (max 25% par ETF). XAW.TO remplace XEF.TO pour un meilleur rendement attendu (+1% annuel) à frais équivalents. Une allocation bonds minimale (ZAG.TO) exploite la corrélation négative obligataire pour améliorer le Sharpe global.`
          : `Ce portefeuille "Suggéré" est construit sur la Frontière Efficiente de Markowitz avec taux sans risque de 3.0% (BdC, 2026). Innovations vs ancienne construction : (1) ZCS.TO pour réduire la vol de la poche bonds, (2) XAW.TO à la place de XEF.TO (+1% rendement), (3) VRE.TO à la place de ZRE.TO (-0.23% MER). Ces ajustements augmentent le rendement net et réduisent la variance du portefeuille.`;

    const taxStrategy =
      type === 'conservateur'
        ? "Stratégie fiscale défensive : obligations (ZCS/ZAG) dans le REER pour protéger les revenus d'intérêts pleinement imposables. Actions canadiennes (XIC) au CELI pour maximiser le crédit d'impôt pour dividendes."
        : "Asset Location optimal : VFV/ZAG au REER (exonération retenue 15% + revenus d'intérêts), XIC/XAW au CELI (gains en capital et dividendes tax-free), VRE au CELI (distributions REITs abritées).";

    return {
      type,
      name,
      description: template.description,
      ...metrics,
      total_mer: Math.round(totalMer * 100) / 100,
      rationale,
      tax_strategy: taxStrategy,
      stress_test: {
        inflation_shock: metrics.volatility > 12
          ? "Impact modéré : les actions offrent une couverture partielle via la hausse des bénéfices nominaux"
          : "Impact négatif sur les obligations à long terme ; ZCS (court terme) protège contre la remontée des taux",
        market_crash: metrics.volatility > 12
          ? `Correction estimée ${Math.round(metrics.volatility * 2)}–${Math.round(metrics.volatility * 2.5)}% (pire cas) — horizon long terme requis`
          : `Baisse contenue ${Math.round(metrics.volatility * 1.5)}–${Math.round(metrics.volatility * 2)}% — poche bonds absorbe l'essentiel`,
        interest_rate_hike: "ZCS.TO (court terme) limite la sensibilité aux taux vs obligations longues. VFV/XAW peuvent subir une contraction des multiples à court terme.",
      },
      allocations,
    };
  });
}
