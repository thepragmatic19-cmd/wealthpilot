// ─────────────────────────────────────────────────────────────────────────────
// RÉFÉRENTIEL COMPACT — PRODUITS FINANCIERS CANADIENS
// ─────────────────────────────────────────────────────────────────────────────
export const CANADIAN_FINANCIAL_KNOWLEDGE = `
## Essentiel de la fiscalité canadienne
- CELI : Max ~95k$ (2025), retraits 100% libres d'impôt.
- REER : Déductible du revenu, imposition au retrait. Plafond 18% revenu (max ~32k$).
- CELIAPP : 8k$/an (max 40k$ vie). Déductible ET libre d'impôt pour achat maison.
- REEE : Subvention 20% (SCEE) sur 2500$/an (max 500$).
- Gain en capital : 2/3 d'inclusion depuis juin 2024.
- Dividendes canadiens : Crédit d'impôt avantageux.
`;

interface ChatGoal {
  type: string;
  label: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  priority: string;
  analysis?: {
    progress: string;
    isOnTrack: boolean;
    remainingAmount: number;
  };
}

interface ChatAllocation {
  asset_class: string;
  instrument_name: string;
  instrument_ticker: string;
  weight: number;
  suggested_account?: string | null;
}

interface ChatPortfolio {
  name: string;
  type: string;
  expectedReturn: number;
  volatility: number;
  sharpeRatio?: number | null;
  maxDrawdown?: number | null;
  totalMer?: number | null;
  taxStrategy?: string | null;
  rationale?: string | null;
  allocations: ChatAllocation[];
  metrics?: {
    totalValue: number;
    drift: number;
    needsRebalancing: boolean;
  } | null;
  allPortfolios?: Array<{
    name: string;
    type: string;
    is_active: boolean;
    expectedReturn: number;
    volatility: number;
    allocations: Array<{
      ticker: string;
      weight: number;
    }>;
  }> | null;
}

export function getChatSystemPrompt(context: {
  clientName: string;
  clientAge: number | null;
  clientProfession: string | null;
  clientFamilySituation: string | null;
  clientDependents: number | null;
  clientInvestmentExperience: string | null;
  clientTaxBracket: string | null;
  annualIncome: number | null;
  monthlyExpenses: number | null;
  totalAssets: number | null;
  totalDebts: number | null;
  monthlySavings: number | null;
  celiBalance: number | null;
  reerBalance: number | null;
  reeeBalance: number | null;
  hasCeli: boolean;
  hasReer: boolean;
  hasReee: boolean;
  riskScore: number;
  riskProfile: string;
  riskAnalysis?: string | null;
  riskKeyFactors?: string[] | null;
  portfolio: ChatPortfolio | null;
  goals: ChatGoal[];
  marketData?: string;
}) {
  const fmt = (v: number | null, suffix = '$') =>
    v != null ? `${v.toLocaleString('fr-CA')} ${suffix}` : 'N/A';

  // ── Situation financière ──────────────────────────────────────
  const netWorth = (context.totalAssets ?? 0) - (context.totalDebts ?? 0);
  const savingsRate = context.annualIncome && context.monthlySavings
    ? Math.round(((context.monthlySavings * 12) / context.annualIncome) * 100)
    : null;

  let financialSection = `## Situation financière\n`;
  financialSection += `- Revenu annuel : ${fmt(context.annualIncome)}\n`;
  financialSection += `- Dépenses mensuelles : ${fmt(context.monthlyExpenses)}\n`;
  financialSection += `- Épargne mensuelle : ${fmt(context.monthlySavings)}${savingsRate !== null ? ` (taux d'épargne : ${savingsRate}%)` : ''}\n`;
  financialSection += `- Actifs totaux : ${fmt(context.totalAssets)}\n`;
  financialSection += `- Dettes totales : ${fmt(context.totalDebts)}\n`;
  financialSection += `- Valeur nette : ${fmt(netWorth)}\n`;
  financialSection += `- Tranche d'imposition : ${context.clientTaxBracket ?? 'N/A'}\n`;
  financialSection += `\n### Comptes enregistrés\n`;
  if (context.hasCeli) financialSection += `- CELI : ${fmt(context.celiBalance)}\n`;
  if (context.hasReer) financialSection += `- REER : ${fmt(context.reerBalance)}\n`;
  if (context.hasReee) financialSection += `- REEE : ${fmt(context.reeeBalance)}\n`;
  if (!context.hasCeli && !context.hasReer && !context.hasReee) {
    financialSection += `- Aucun compte enregistré ouvert\n`;
  }

  // ── Portefeuilles ──────────────────────────────────────────────
  let portfolioSection = `## Portefeuilles de l'utilisateur\n`;
  if (context.portfolio) {
    const p = context.portfolio;
    portfolioSection += `### Portefeuille ACTIF : **${p.name}** (type : ${p.type})\n`;
    portfolioSection += `- Rendement attendu : ${p.expectedReturn}% | Volatilité : ${p.volatility}%`;
    if (p.sharpeRatio != null) portfolioSection += ` | Sharpe : ${p.sharpeRatio}`;
    if (p.maxDrawdown != null) portfolioSection += ` | Drawdown max : ${p.maxDrawdown}%`;
    if (p.totalMer != null) portfolioSection += ` | MER total : ${p.totalMer}%`;
    
    if (p.metrics) {
      portfolioSection += `\n- Analyse de dérive : ${p.metrics.drift.toFixed(1)}% | Besoin de rééquilibrage : ${p.metrics.needsRebalancing ? 'OUI' : 'NON'}`;
    }
    portfolioSection += '\n';

    if (p.allocations.length > 0) {
      portfolioSection += `\n#### Composition détaillée de ${p.name}\n`;
      portfolioSection += `| Poids | Ticker | Instrument | Classe d'actif | Compte |\n`;
      portfolioSection += `|-------|--------|------------|----------------|--------|\n`;
      for (const a of [...p.allocations].sort((x, y) => y.weight - x.weight)) {
        portfolioSection += `| ${a.weight}% | ${a.instrument_ticker} | ${a.instrument_name} | ${a.asset_class} | ${a.suggested_account ?? '—'} |\n`;
      }
    }

    if (p.allPortfolios && p.allPortfolios.length > 1) {
      portfolioSection += `\n### Autres portefeuilles disponibles pour comparaison :\n`;
      for (const other of p.allPortfolios) {
        if (other.is_active) continue;
        portfolioSection += `- **${other.name}** (${other.type}) : Rendement ${other.expectedReturn}% | Volatilité ${other.volatility}%\n`;
      }
    }

    if (p.taxStrategy) {
      portfolioSection += `\n#### Stratégie fiscale\n${p.taxStrategy}\n`;
    }
    if (p.rationale) {
      portfolioSection += `\n#### Justification\n${p.rationale}\n`;
    }
  } else {
    portfolioSection += `Aucun portefeuille sélectionné.\n`;
  }

  // ── Objectifs ─────────────────────────────────────────────────
  let goalsSection = `## Objectifs financiers\n`;
  if (context.goals.length === 0) {
    goalsSection += `Aucun objectif défini.\n`;
  } else {
    const now = new Date();
    for (const g of context.goals) {
      const progress = g.targetAmount > 0
        ? Math.round((g.currentAmount / g.targetAmount) * 100)
        : 0;
      let line = `- **${g.label}** (${g.type}, priorité ${g.priority}) : `;
      line += `${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} — ${progress}% atteint`;
      if (g.targetDate) {
        const months = Math.round(
          (new Date(g.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)
        );
        const timeLeft = months >= 12
          ? `${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}${months % 12 > 0 ? ` ${months % 12} mois` : ''}`
          : `${months} mois`;
        line += ` — échéance ${g.targetDate} (dans ${timeLeft})`;
      }
      if (g.analysis) {
        line += ` | Statut : ${g.analysis.isOnTrack ? 'En bonne voie' : 'Attention'} | Reste à épargner : ${fmt(g.analysis.remainingAmount)}`;
      }
      goalsSection += `${line}\n`;
    }
  }

  // ── Profil de risque ──────────────────────────────────────────
  let riskSection = `## Profil de risque\n`;
  riskSection += `- Score : ${context.riskScore}/10\n`;
  riskSection += `- Profil : ${context.riskProfile}\n`;
  if (context.riskKeyFactors && context.riskKeyFactors.length > 0) {
    riskSection += `- Facteurs clés : ${context.riskKeyFactors.join(', ')}\n`;
  }
  if (context.riskAnalysis) {
    const excerpt = context.riskAnalysis.length > 500
      ? context.riskAnalysis.slice(0, 500) + '...'
      : context.riskAnalysis;
    riskSection += `- Analyse : ${excerpt}\n`;
  }

  // ── Marché ────────────────────────────────────────────────────
  const marketSection = context.marketData
    ? `\n## Données de marché en temps réel\n${context.marketData}\n`
    : '';

  return `Tu es **Alex**, gestionnaire de portefeuille détenteur du titre CFA (Chartered Financial Analyst) chez WealthPilot. Tu travailles exclusivement avec des Canadiens et tu connais parfaitement le système fiscal, les comptes enregistrés (CELI, REER, REEE) et les marchés canadiens et américains.

## Ton identité professionnelle
- CFA charterholder avec 12 ans d'expérience en gestion de portefeuille institutionnel
- Spécialiste des finances personnelles canadiennes : CELI, REER, REEE, fiscalité fédérale et provinciale
- Tu gères aujourd'hui le portefeuille de ${context.clientName}

## Ta façon de communiquer
Tu parles comme un ami expert : tu connais la finance à fond, mais tu l'expliques simplement.
- **Zéro jargon inutile** — si tu dois utiliser un terme technique (ex: "ratio de Sharpe", "duration", "MER"), tu l'expliques en une phrase simple immédiatement après
- **Des exemples concrets canadiens** — tu compares avec des choses que tout le monde comprend (ex: "c'est comme si votre argent travaillait à 7% par année, soit presque le double d'un CPG")
- **Direct et honnête** — tu dis clairement ce que tu penses, sans langue de bois
- **Chaleureux mais professionnel** — tu tutoies le client, tu l'appelles par son prénom si disponible
- **Concis** — maximum 250 mots par réponse sauf si une analyse détaillée est explicitement demandée ; utilise des listes à puces quand c'est plus clair

## Profil de ${context.clientName}
- Âge : ${context.clientAge != null ? `${context.clientAge} ans` : 'N/A'}
- Profession : ${context.clientProfession ?? 'N/A'}
- Situation familiale : ${context.clientFamilySituation ?? 'N/A'}${context.clientDependents ? ` — ${context.clientDependents} personne(s) à charge` : ''}
- Expérience en investissement : ${context.clientInvestmentExperience ?? 'N/A'}

${financialSection}
${riskSection}
${portfolioSection}
${goalsSection}${marketSection}
${CANADIAN_FINANCIAL_KNOWLEDGE}

## Tes outils de calcul
Tu as accès à des outils de simulation financière (projections, économies d'impôt, rééquilibrage). Utilise-les dès qu'une question nécessite un chiffre précis — ne devine jamais. Présente les résultats avec une explication simple de ce que ça signifie concrètement pour le client.

## Règles absolues
1. Toujours en français canadien
2. **Toujours basé sur les vraies données du client** — ne jamais inventer un chiffre absent du contexte
3. Si une donnée manque, dis-le clairement : "Je n'ai pas cette info dans ton dossier"
4. Pas de recommandations de titres individuels (actions de compagnies) — uniquement les ETFs du portefeuille
5. Si des données de marché en temps réel sont disponibles, explique concrètement leur impact sur CE portefeuille
6. Termine par un avertissement uniquement si le conseil est très spécifique : *"Note : ceci est à titre informatif. Pour des recommandations officielles, consulte un conseiller financier agréé."*
7. Date du jour : ${new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' })}`;
}
