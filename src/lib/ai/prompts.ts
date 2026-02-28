// ─────────────────────────────────────────────────────────────────────────────
// RÉFÉRENTIEL COMPACT — PRODUITS FINANCIERS CANADIENS
// ─────────────────────────────────────────────────────────────────────────────
export const CANADIAN_FINANCIAL_KNOWLEDGE = `
## Essentiel fiscalité CA
- CELI: Max ~95k$ (2025), retraits 100% libres d'impôt.
- REER: Déductible, impôt au retrait. Plafond 18% (max ~32k$). Traité fiscal US-CAN: pas de retenue source US sur dividendes dans REER.
- CELIAPP: 8k$/an (max 40k$). Déductible + retraits libres d'impôt pour achat maison.
- Gain capital: 2/3 inclusion si >250k$ (depuis juin 2024).
- Dividendes CA: Crédit d'impôt en non-enregistré.
`;

export const RISK_PROFILE_SYSTEM_PROMPT = `Tu es un conseiller financier certifié (CFA, CFP) spécialisé dans le marché canadien. Réponds UNIQUEMENT en JSON strict.`;

export const FOLLOW_UP_SYSTEM_PROMPT = `Tu es un conseiller financier. Pose 3 questions de suivi. Réponds UNIQUEMENT en JSON strict.`;

export function buildPortfolioSystemPrompt(instrumentsSummary: string): string {
  return `Tu es un gestionnaire CFA chez WealthPilot. Instruments: ${instrumentsSummary}. Réponds UNIQUEMENT en JSON strict.`;
}

export function buildPortfolioUserMessage(context: any): string {
  return `Analyse le profil du client et propose 3 portefeuilles.`;
}

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

  // ── Portefeuilles ──────────────────────────────────────────────
  let portfolioSection = `## Portefeuilles\n`;
  if (context.portfolio) {
    const p = context.portfolio;
    portfolioSection += `### ACTIF : **${p.name}** (${p.type})\n`;
    portfolioSection += `- Rendement: ${p.expectedReturn}% | Volatilité: ${p.volatility}%\n`;
    
    if (p.metrics) {
      portfolioSection += `- Dérive: ${p.metrics.drift.toFixed(1)}% | Rééquilibrage: ${p.metrics.needsRebalancing ? 'OUI' : 'NON'}\n`;
    }

    if (p.allPortfolios && p.allPortfolios.length > 1) {
      portfolioSection += `### Autres:\n`;
      for (const other of p.allPortfolios) {
        if (other.is_active) continue;
        portfolioSection += `- **${other.name}** (${other.type}): Rendement ${other.expectedReturn}% | Volatilité ${other.volatility}%\n`;
      }
    }
  }

  // ── Objectifs ─────────────────────────────────────────────────
  let goalsSection = `## Objectifs\n`;
  for (const g of context.goals) {
    const progress = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
    goalsSection += `- **${g.label}**: ${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} — ${progress}% atteint\n`;
  }

  const marketSection = context.marketData ? `\n## Marché\n${context.marketData}\n` : '';

  return `Tu es Alex, CFA chez WealthPilot. Expert finances CA (CELI, REER, REEE).
Client: ${context.clientName}, ${context.clientAge ?? 'N/A'} ans.

${financialSection}
${portfolioSection}
${goalsSection}${marketSection}
${CANADIAN_FINANCIAL_KNOWLEDGE}

## Règles
1. Français canadien.
2. Basé UNIQUEMENT sur ces données.
3. Très concis (< 200 mots).
4. Utilise tes outils pour tout calcul précis.
Date: ${new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' })}`;
}
