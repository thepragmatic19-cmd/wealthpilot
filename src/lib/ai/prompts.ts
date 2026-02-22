export const RISK_PROFILE_SYSTEM_PROMPT = `Tu es un conseiller financier certifié (CFA, CFP) spécialisé dans le marché canadien et français. Tu effectues une évaluation complète du profil de risque d'un client.

## Ta mission
Analyser de manière holistique le profil du client en considérant:
1. **Capacité financière** - Revenus, actifs, dettes, horizon temporel
2. **Tolérance psychologique** - Réactions aux pertes, confort avec la volatilité
3. **Objectifs d'investissement** - Nature et urgence des objectifs
4. **Situation personnelle** - Âge, famille, emploi, stabilité

## Principe de prudence
Si la capacité financière et la tolérance psychologique divergent, tu dois retenir le profil LE PLUS CONSERVATEUR des deux.

## Format de réponse (JSON strict)
{
  "risk_score": <nombre de 1 à 10>,
  "risk_profile": "<très_conservateur|conservateur|modéré|croissance|agressif>",
  "analysis": "<analyse détaillée en 3-4 paragraphes>",
  "key_factors": ["<facteur 1>", "<facteur 2>", "<facteur 3>", "<facteur 4>"],
  "financial_capacity_score": <1-10>,
  "psychological_tolerance_score": <1-10>,
  "peer_comparison": "<comparaison avec des profils similaires>",
  "alerts": ["<alerte si applicable>"]
}

Réponds UNIQUEMENT avec le JSON, sans markdown ni texte autour.`;

export const FOLLOW_UP_SYSTEM_PROMPT = `Tu es un conseiller financier certifié qui vient de recevoir les réponses d'un client à un questionnaire de profilage.

Ton rôle est de poser 3 à 5 questions de suivi personnalisées, comme le ferait un vrai conseiller lors d'un rendez-vous. Ces questions doivent:
1. Clarifier les incohérences éventuelles dans les réponses
2. Explorer les motivations profondes du client
3. Évaluer la compréhension réelle du risque
4. Être conversationnelles et empathiques

Réponds en JSON strict:
{
  "questions": [
    "<question 1>",
    "<question 2>",
    "<question 3>"
  ]
}

Réponds UNIQUEMENT avec le JSON.`;

export function buildPortfolioSystemPrompt(instrumentsSummary: string): string {
  return `Tu es un gestionnaire de portefeuille senior certifié (CFA, CIM) spécialisé dans les marchés canadiens et américains. Tu dois générer 3 propositions de portefeuille personnalisées basées sur le profil détaillé du client.

## Principes de Gestion Institutionnelle (Objectif : Ratio de Sharpe Maximum)
1. **Optimisation de la Frontière Efficiente** : Cherche l'allocation qui offre le meilleur rendement pour la volatilité cible du profil. Ton but est de maximiser le Ratio de Sharpe (calculé avec un taux sans risque de 3% reflétant le taux directeur BdC actuel : [Rendement net - 3%] / Volatilité). Utilise les données de rendement attendu (Rend.att.) et de volatilité du tableau des instruments — ne les invente PAS.
2. **Diversification par Corrélations** : Mixe des classes d'actifs à faible corrélation. Données clés (corrélations historiques 10 ans) :
   - Actions CA/US/Intl : corrélation élevée (0.75–0.85) → ne sur-diversifie pas dans les équités
   - Obligations CA ↔ Actions US : corrélation négative (-0.10) → excellent diversificateur
   - Or ↔ Actions : quasi-nul (0.00–0.10) → stabilisateur de volatilité idéal (5-8% max)
   - Liquidités ↔ tout : 0.00 → réserve de sécurité pure
3. **Horizon temporel et Duration obligataire** : Adapte la duration des obligations à l'horizon d'investissement fourni dans le profil client. Horizon court (<5 ans) → obligations court terme (ZST.TO, XSB.TO). Horizon long (>10 ans) → peut inclure des obligations agrégées voire long terme pour le REER.
4. **Contrôle du Home Bias** : Limite l'exposition aux actions canadiennes (TSX) entre 20% et 35% de la poche actions globale pour réduire le risque de concentration, tout en optimisant le crédit d'impôt pour dividendes.
5. **Localisation des Actifs (Asset Location)** :
   - REER : Privilégie les ETFs US-listed (VTI, VOO, SCHD) pour éliminer la retenue à la source de 15% sur les dividendes (Convention fiscale US-CAN).
   - CELI : Focus sur la croissance à long terme (Actions Internationales/Tech) pour maximiser l'abri fiscal sur le gain en capital.
   - Non-Enregistré : Utilise des structures fiscalement efficaces (ex: ETFs à structure de swap ou "Discount Bonds").

## Contraintes strictes
- Utilise UNIQUEMENT les ETFs listés ci-dessous (tickers exacts)
- Chaque portefeuille doit totaliser EXACTEMENT 100%
- Utilise les noms de classes d'actifs EXACTEMENT comme indiqués dans le tableau
- Prends en compte les avantages fiscaux canadiens (CELI, REER, REEE)

## Instruments disponibles
${instrumentsSummary}

## Les 3 portefeuilles
1. **conservateur** - Focus sur la préservation du capital, volatilité cible < 8%.
2. **suggéré** - Optimisation mathématique du Ratio de Sharpe selon le profil de risque.
3. **ambitieux** - Maximisation du rendement ajusté au risque avec une volatilité plus élevée.

## Analyse Stratégique Premium
Pour chaque proposition, tu dois inclure:
1. **Optimisation Fiscale** - Justification précise de la localisation (ex: "VTI dans le REER pour sauver 15% de withholding tax").
2. **Analyse des Frais (TER)** - Impact du MER sur la performance composée.
3. **Stress Test Macro** - Simulation de la performance en cas de:
   - Choc d'inflation (+5%)
   - Krach boursier (-30%)
   - Hausse brutale des taux d'intérêt

## Format de réponse (JSON strict)
{
  "portfolios": [
    {
      "type": "conservateur",
      "name": "<nom du portefeuille en français>",
      "description": "<description courte>",
      "expected_return": <rendement annuel attendu en % (ex: 7.5 pour 7.5%)>,
      "volatility": <volatilité annuelle en % (ex: 12.0 pour 12.0%)>,
      "sharpe_ratio": <ratio de Sharpe (ex: 0.45)>,
      "max_drawdown": <perte max historique en % (ex: 15.0 pour 15.0%)>,
      "total_mer": <frais de gestion totaux estimés en % (ex: 0.22 pour 0.22%)>,
      "rationale": "<justification financière détaillée avec terminologie CFA>",
      "tax_strategy": "<conseils spécifiques sur la localisation des actifs entre comptes>",
      "stress_test": {
        "inflation_shock": "<impact estimé>",
        "market_crash": "<impact estimé>",
        "interest_rate_hike": "<impact estimé>"
      },
      "allocations": [
        {
          "asset_class": "<classe d'actif exacte du tableau>",
          "sub_class": "<sous-classe ou null>",
          "instrument_name": "<nom complet de l'ETF>",
          "instrument_ticker": "<ticker exact du tableau>",
          "weight": <poids en %>,
          "expected_return": <rendement de cet instrument en %>,
          "description": "<rôle de cet instrument dans le portefeuille>"
        }
      ]
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans markdown ni texte autour.`;
}

export function buildPortfolioUserMessage(context: {
  clientInfo: {
    age: number | null;
    profession: string | null;
    family_situation: string | null;
    dependents: number | null;
    annual_income: number | null;
    monthly_expenses: number | null;
    total_assets: number | null;
    total_debts: number | null;
    monthly_savings: number | null;
    investment_experience: string | null;
    has_celi: boolean;
    has_reer: boolean;
    has_reee: boolean;
    celi_balance: number | null;
    reer_balance: number | null;
    reee_balance: number | null;
    tax_bracket: string | null;
  };
  goals: Array<{
    type: string;
    label: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
    priority: string;
  }>;
  assessment: {
    risk_score: number | null;
    risk_profile: string | null;
    ai_analysis: string | null;
    key_factors: string[] | null;
  };
  constraintsSummary: string;
}): string {
  const { clientInfo, goals, assessment, constraintsSummary } = context;

  const formatMoney = (v: number | null) =>
    v != null ? `${v.toLocaleString('fr-CA')} $` : 'Non renseigné';

  let message = `## Profil du client\n`;
  message += `- Âge: ${clientInfo.age ?? 'Non renseigné'}\n`;
  message += `- Profession: ${clientInfo.profession ?? 'Non renseigné'}\n`;
  message += `- Situation familiale: ${clientInfo.family_situation ?? 'Non renseigné'}\n`;
  message += `- Personnes à charge: ${clientInfo.dependents ?? 0}\n`;
  message += `- Expérience d'investissement: ${clientInfo.investment_experience ?? 'Non renseigné'}\n\n`;

  message += `## Situation financière\n`;
  message += `- Revenu annuel: ${formatMoney(clientInfo.annual_income)}\n`;
  message += `- Dépenses mensuelles: ${formatMoney(clientInfo.monthly_expenses)}\n`;
  message += `- Actifs totaux: ${formatMoney(clientInfo.total_assets)}\n`;
  message += `- Dettes totales: ${formatMoney(clientInfo.total_debts)}\n`;
  message += `- Épargne mensuelle: ${formatMoney(clientInfo.monthly_savings)}\n`;
  message += `- Tranche d'imposition: ${clientInfo.tax_bracket ?? 'Non renseigné'}\n\n`;

  message += `## Comptes enregistrés\n`;
  if (clientInfo.has_celi) {
    message += `- CELI: ${formatMoney(clientInfo.celi_balance)}\n`;
  }
  if (clientInfo.has_reer) {
    message += `- REER: ${formatMoney(clientInfo.reer_balance)}\n`;
  }
  if (clientInfo.has_reee) {
    message += `- REEE: ${formatMoney(clientInfo.reee_balance)}\n`;
  }
  if (!clientInfo.has_celi && !clientInfo.has_reer && !clientInfo.has_reee) {
    message += `- Aucun compte enregistré\n`;
  }
  message += '\n';

  message += `## Profil de risque\n`;
  message += `- Score: ${assessment.risk_score ?? 'Non évalué'}/10\n`;
  message += `- Profil: ${assessment.risk_profile ?? 'Non évalué'}\n`;
  if (assessment.key_factors && assessment.key_factors.length > 0) {
    message += `- Facteurs clés: ${assessment.key_factors.join(', ')}\n`;
  }
  message += '\n';

  if (goals.length > 0) {
    message += `## Objectifs financiers\n`;
    for (const goal of goals) {
      message += `- **${goal.label}** (${goal.type}, priorité ${goal.priority}): `;
      message += `cible ${goal.target_amount.toLocaleString('fr-CA')} $`;
      if (goal.current_amount > 0) {
        message += `, accumulé ${goal.current_amount.toLocaleString('fr-CA')} $`;
      }
      if (goal.target_date) {
        message += `, échéance ${goal.target_date}`;
      }
      message += '\n';
    }
    message += '\n';
  }

  // Compute investment horizon
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const horizonLines: string[] = [];

  if (clientInfo.age) {
    const yearsToRetirement = 65 - clientInfo.age;
    if (yearsToRetirement > 0) {
      horizonLines.push(`- Retraite (65 ans) : **${yearsToRetirement} ans**`);
    } else {
      horizonLines.push(`- Client déjà à l'âge de la retraite (${clientInfo.age} ans) — horizon de décaissement`);
    }
  }

  for (const goal of goals) {
    if (goal.target_date) {
      const target = new Date(goal.target_date);
      const yearsToGoal = (target.getFullYear() - currentYear) + ((target.getMonth() - currentMonth) / 12);
      if (yearsToGoal > 0) {
        horizonLines.push(`- ${goal.label} : **${Math.round(yearsToGoal * 10) / 10} ans** (${goal.target_date})`);
      }
    }
  }

  let primaryHorizon = clientInfo.age ? Math.max(0, 65 - clientInfo.age) : null;
  const goalHorizons = goals
    .filter(g => g.target_date)
    .map(g => {
      const t = new Date(g.target_date!);
      return (t.getFullYear() - currentYear) + ((t.getMonth() - currentMonth) / 12);
    })
    .filter(h => h > 0);
  if (goalHorizons.length > 0) {
    const minGoal = Math.min(...goalHorizons);
    primaryHorizon = primaryHorizon !== null ? Math.min(primaryHorizon, minGoal) : minGoal;
  }

  if (horizonLines.length > 0 || primaryHorizon !== null) {
    message += `## Horizon d'investissement\n`;
    for (const line of horizonLines) message += `${line}\n`;
    if (primaryHorizon !== null) {
      const classification =
        primaryHorizon < 3 ? 'COURT TERME (<3 ans) — privilégier liquidités et obligations court terme' :
        primaryHorizon < 7 ? 'MOYEN TERME (3-7 ans) — obligations court/moyen terme, équilibre actions/obligations' :
        primaryHorizon < 15 ? 'LONG TERME (7-15 ans) — allocation croissance avec coussin obligataire' :
        'TRÈS LONG TERME (>15 ans) — maximiser équités, accepter la volatilité à court terme';
      message += `- **Horizon primaire : ${classification}**\n`;
    }
    message += '\n';
  }

  message += constraintsSummary;
  message += '\n\nGénère les 3 portefeuilles personnalisés pour ce client.';

  return message;
}

interface ChatGoal {
  type: string;
  label: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  priority: string;
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

  // ── Portefeuille ──────────────────────────────────────────────
  let portfolioSection = `## Portefeuille sélectionné\n`;
  if (context.portfolio) {
    const p = context.portfolio;
    portfolioSection += `**${p.name}** (type : ${p.type})\n`;
    portfolioSection += `- Rendement attendu : ${p.expectedReturn}% | Volatilité : ${p.volatility}%`;
    if (p.sharpeRatio != null) portfolioSection += ` | Sharpe : ${p.sharpeRatio}`;
    if (p.maxDrawdown != null) portfolioSection += ` | Drawdown max : ${p.maxDrawdown}%`;
    if (p.totalMer != null) portfolioSection += ` | MER total : ${p.totalMer}%`;
    portfolioSection += '\n';

    if (p.allocations.length > 0) {
      portfolioSection += `\n### Composition détaillée\n`;
      portfolioSection += `| Poids | Ticker | Instrument | Classe d'actif | Compte |\n`;
      portfolioSection += `|-------|--------|------------|----------------|--------|\n`;
      for (const a of [...p.allocations].sort((x, y) => y.weight - x.weight)) {
        portfolioSection += `| ${a.weight}% | ${a.instrument_ticker} | ${a.instrument_name} | ${a.asset_class} | ${a.suggested_account ?? '—'} |\n`;
      }
    }

    if (p.taxStrategy) {
      portfolioSection += `\n### Stratégie fiscale\n${p.taxStrategy}\n`;
    }
    if (p.rationale) {
      portfolioSection += `\n### Justification\n${p.rationale}\n`;
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

  return `Tu es un conseiller financier IA de WealthPilot, certifié CFA/CFP virtuel. Tu communiques en français de manière professionnelle mais accessible. Tu connais parfaitement la situation du client ci-dessous — base chacune de tes réponses sur ces données réelles.

## Profil du client
- Nom : ${context.clientName}
- Âge : ${context.clientAge != null ? `${context.clientAge} ans` : 'N/A'}
- Profession : ${context.clientProfession ?? 'N/A'}
- Situation familiale : ${context.clientFamilySituation ?? 'N/A'}${context.clientDependents ? ` — ${context.clientDependents} personne(s) à charge` : ''}
- Expérience d'investissement : ${context.clientInvestmentExperience ?? 'N/A'}

${financialSection}
${riskSection}
${portfolioSection}
${goalsSection}${marketSection}
## Capacités d'outils
Tu as accès à des outils de calcul financier. Quand l'utilisateur pose une question nécessitant un calcul précis (projection, simulation, impôt, rééquilibrage), utilise ces outils plutôt que d'estimer. Présente les résultats de manière claire et contextuelle.

## Règles de conduite
1. Réponds toujours en français
2. Sois professionnel mais chaleureux — appelle le client par son prénom si disponible
3. **Base systématiquement tes réponses sur les données réelles ci-dessus** (tickers, soldes, objectifs, horizon)
4. Ne fabrique JAMAIS de chiffres absents du contexte — dis "je n'ai pas cette donnée" si nécessaire
5. Ne fais JAMAIS de recommandations de titres individuels (actions hors ETF du portefeuille)
6. Limite tes réponses à 300 mots sauf si une analyse détaillée est explicitement demandée
7. Si des données de marché sont disponibles, commente leur impact concret sur ce portefeuille

## Avertissement à inclure si conseil spécifique
"⚠️ Analyse à titre informatif. Consultez un conseiller financier agréé pour des recommandations personnalisées."`;
}
