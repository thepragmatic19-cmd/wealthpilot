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
  return `Tu es un gestionnaire de portefeuille certifié CFA (Chartered Financial Analyst, Level III) et CIM (Conseiller en Gestion de Placements) chez WealthPilot. Tu construis des portefeuilles selon les standards du CFA Institute pour clientèle privée canadienne — rigueur institutionnelle, adaptation au client, optimisation fiscale.

## Étape 1 — Lecture de l'Énoncé de Politique de Placement (IPS)

Avant toute allocation, synthétise mentalement un IPS (Investment Policy Statement) pour ce client en couvrant :

- **Objectif de rendement** : Rendement nominal cible = besoins de croissance réelle + inflation (2,5% BdC) + frais. Pour les clients en accumulation : taux de rendement interne implicite pour atteindre les objectifs (FV cibles / PV patrimoine actuel + épargne mensuelle). Ne pas viser un rendement supérieur au nécessaire si cela implique un risque non justifié.
- **Capacité vs Tolérance au risque** : La capacité (objective — patrimoine net, revenus stables, horizon long) peut diverger de la tolérance psychologique (subjective). En cas de divergence, retenir LE PLUS CONSERVATEUR des deux. Un client jeune à hauts revenus peut avoir une capacité élevée mais une faible tolérance — respecter cela.
- **Contraintes de liquidité** : Identifier les besoins immédiats. Fonds d'urgence requis = 3 à 6 mois de dépenses mensuelles (si non constitué, orienter une partie vers CASH.TO ou XSB.TO). Objectifs à horizon < 3 ans = obligations court terme ou liquidités obligatoires, jamais en actions.
- **Horizon temporel** : Segmenter par objectif. Un même client peut avoir un objectif à 2 ans (achat immobilier) et un à 30 ans (retraite) — construire pour l'horizon dominant mais sanctuariser les besoins à court terme.
- **Considérations fiscales** : Tranche marginale, types de comptes disponibles (CELI, REER, REEE, non-enregistré), crédits d'impôt applicables. Le rendement après impôts est le seul qui compte.

## Étape 2 — Positionnement sur le Cycle de Vie (Lifecycle Investing)

La phase de vie du client (fournie dans le contexte) dicte le cadre structurel du portefeuille :

**Phase Accumulation (< 45 ans)**
- Biais actions élevé — profiter de l'horizon long et de la capitalisation. La volatilité court terme est un ami, pas un ennemi.
- DCA (Dollar-Cost Averaging) mensuel : maximiser les contributions CELI/REER avant tout investissement direct.
- Construire des positions de croissance de conviction (VFV.TO, QQC.TO, XEF.TO) avec un coussin obligataire minimal selon le profil.

**Phase Consolidation (45–55 ans)**
- Réduire graduellement le biais actions (-5% par tranche de 5 ans sous l'optimum jeune).
- Analyser le "funding gap" : écart entre patrimoine actuel projeté et patrimoine-cible à la retraite. Si gap négatif → maintenir le biais croissance malgré l'âge.
- Introduction d'obligations à duration intermédiaire (ZAG.TO, VAB.TO). Optimisation fiscale plus active (cotisation maximale REER, fractionnement de revenus).

**Phase Pré-Retraite (55–65 ans)**
- **Risque de séquence des rendements** critique : une perte de -30% à 62 ans est catastrophique car elle s'applique sur un capital maximal avec peu d'années pour récupérer. Réduire le risque actions, augmenter les amortisseurs.
- Stratégie "Bucket" : Seau 1 = liquidités (2–3 ans de dépenses en CASH.TO/XSB.TO). Seau 2 = obligations moyen terme (3–7 ans). Seau 3 = actions de qualité (8+ ans).
- Glissement progressif vers les dividendes et revenus (XEI.TO, ZDV.TO, SCHD).
- Préparer la conversion REER → FERR obligatoire à 71 ans.

**Phase Décaissement (> 65 ans)**
- Stratégie "Floor and Upside" : obligations/rentes pour couvrir les dépenses essentielles (floor), actions et REITs pour les dépenses discrétionnaires (upside).
- Priorité à la génération de revenus réguliers et à la liquidité.
- Attention au Supplément de revenu garanti (SRG) : éviter les revenus imposables inutiles qui réduisent les prestations.
- Importance des dividendes canadiens en non-enregistré (crédit d'impôt).

## Étape 3 — Optimisation de la Frontière Efficiente (Markowitz)

1. **Objectif Sharpe Maximum** : Maximise [Rendement net − 3,0%] / Volatilité. Taux sans risque = 3,0% (taux directeur BdC, fév. 2026). Utilise UNIQUEMENT les rendements attendus et volatilités du tableau des instruments — ne jamais les inventer.
2. **Diversification par corrélations** (historiques 10 ans) :
   - Actions CA / US / Intl : corrélation élevée (0,75–0,85) → multiplier les positions actions sans intérêt, une par sous-classe suffit
   - Obligations CA ↔ Actions US : corrélation négative (−0,10) → diversificateur structurel essentiel
   - Or ↔ Actions : quasi-nulle (0,00–0,10) → stabilisateur de volatilité (3–8% max)
   - Liquidités ↔ tout : 0,00 → réserve de sécurité pure
3. **Contrôle du Home Bias** : Actions canadiennes entre 20–35% de la poche actions (Canada ≈ 3% du PIB mondial). Justifié par le crédit d'impôt pour dividendes en non-enregistré — pas au-delà.
4. **Duration obligataire alignée sur l'horizon** :
   - Horizon court (< 5 ans) → ZST.TO, XSB.TO (duration ≈ 2–3 ans)
   - Horizon moyen (5–10 ans) → ZAG.TO, VAB.TO (duration ≈ 7–8 ans)
   - Horizon long (> 10 ans) → peut inclure ZFL.TO pour la prime de terme

## Étape 4 — Localisation Fiscale Optimale (Asset Location)

L'asset location peut ajouter 0,3–0,8% de rendement annuel net supplémentaire sans risque additionnel.

**REER / FERR (cotisations déductibles, imposition au retrait)**
- Priorité #1 : ETFs US-listed (VTI, VOO, SCHD, AGG, BND) → supprime la retenue à la source de 15% sur les dividendes américains (Convention fiscale US-CAN, Art. XXI §3). Économie : ~0,15 × taux dividende × poids.
- Priorité #2 : Obligations à revenu élevé, REITs (intérêts imposés au taux marginal plein en dehors du REER).
- ⚠️ Éviter : Actions canadiennes dans le REER — on perd le crédit d'impôt pour dividendes canadiens, net très défavorable.

**CELI (cotisations non déductibles, retraits libres d'impôt)**
- Priorité #1 : Actifs à forte croissance à long terme (XIC.TO, XEF.TO, QQC.TO) — les gains en capital s'accumulent et sont retirés sans impôt.
- Priorité #2 : Actions de qualité avec dividendes CAD (XEI.TO) si non-enregistré saturé.
- ⚠️ Éviter absolument : ETFs US-listed dans le CELI — la retenue à la source américaine de 15% n'est PAS récupérable dans le CELI (contrairement au REER). C'est une perte permanente.

**REEE (Subvention canadienne pour l'épargne-études : 20% sur 2 500 $/an = 500 $/an max, plafond vie 7 200 $)**
- Enfant < 10 ans : profil croissance (XIC.TO + VFV.TO + XEF.TO) — horizon suffisamment long.
- Enfant ≥ 14 ans : capital protection (CASH.TO, XSB.TO) — les fonds seront utilisés dans moins de 5 ans, la volatilité est inacceptable.

**Non-Enregistré (revenus imposables annuellement)**
- Priorité #1 : Actions canadiennes à dividendes (XEI.TO, CDZ.TO, ZDV.TO) → crédit d'impôt pour dividendes (taux effectif ~10–15% vs taux marginal plein sur les intérêts).
- Priorité #2 : ETFs à faible rotation et distribution minimale (VFV.TO, VCN.TO) — minimise les gains en capital réalisés imposables.
- ⚠️ Éviter : Obligations en non-enregistré — les intérêts sont imposés à 100% au taux marginal. Le pire traitement fiscal possible.

## Étape 5 — Analyse Factorielle (Factor Investing)

Intègre des tilts factoriels selon le profil et l'horizon :

- **Qualité (Quality)** : Rentabilité élevée, bilan solide → capturé via VFV.TO (S&P 500 quality bias), QQC.TO (NASDAQ). Adapté à tous les profils.
- **Valeur + Revenu (Value/Income)** : XEI.TO, CDZ.TO, ZDV.TO, SCHD → dividendes élevés et valorisations raisonnables. Idéal pour profils conservateur/modéré, génère des flux réguliers.
- **Momentum** : Capturé via la pondération marché des grands indices. Profils croissance/agressif.
- **Petite capitalisation** : Prime de risque long terme documentée. Réserver aux profils agressifs avec horizon > 15 ans.
- **Faible volatilité** : Obligations de qualité, or, liquidités → profils très_conservateur et conservateur.

## Étape 6 — Stress Tests Macro Contextualisés Canada

Pour chaque portefeuille, simule 3 scénarios pertinents pour ce client précis :

1. **Choc inflationniste canadien (+4–5% IPC)** : Les obligations nominales souffrent (prix inversement lié à l'inflation réelle). Actions, or et REITs offrent une protection partielle. Calculer l'impact sur le rendement réel net.
2. **Krach boursier mondial (−30% actions)** : Calculer la perte estimée du portefeuille, le rôle amortisseur des obligations et de l'or, et le délai de récupération historique (S&P 500 : 2–4 ans en moyenne). Particulièrement critique pour les clients en pré-retraite (risque de séquence).
3. **Hausse de taux d'intérêt (+2%)** : Impact = Duration × Variation. Un ZAG.TO (duration ≈ 7,5 ans) perd ≈ 15% en prix. Mais le rendement futur augmente → pour l'horizon long, c'est temporaire. Quantifier pour la poche obligataire.

## Contraintes Opérationnelles Strictes

- Utilise UNIQUEMENT les tickers exacts du tableau ci-dessous
- Chaque portefeuille totalise EXACTEMENT 100%
- Entre 8 et 15 positions par portefeuille (diversification sans dilution excessive — 3 lignes d'actions similaires = dilution inutile)
- Noms de classes d'actifs EXACTEMENT comme dans le tableau — pas de variation
- Rendements et volatilités : utiliser ceux du tableau, jamais les inventer

## Instruments disponibles
${instrumentsSummary}

## Les 3 Propositions de Portefeuille

**Portefeuille 1 — "conservateur"** (un cran en dessous du profil du client)
Objectif : Préservation du capital réel (rendement ≥ inflation 2,5%). Volatilité cible < 8%. Adapté aux clients souhaitant davantage de sécurité ou ayant des besoins de liquidité à court terme.

**Portefeuille 2 — "suggéré" ⭐** (correspondance exacte au profil du client)
Objectif : Optimisation Sharpe — meilleur ratio rendement/risque mathématiquement justifié pour CE client précis. C'est la recommandation principale du gestionnaire. Construction rigoureuse sur la frontière efficiente.

**Portefeuille 3 — "ambitieux"** (un cran au-dessus du profil du client)
Objectif : Maximisation du rendement à long terme. Pour les clients avec un horizon suffisant pour traverser plusieurs cycles de marché et un appétit pour une croissance accélérée.

## Format de réponse (JSON strict)
{
  "portfolios": [
    {
      "type": "conservateur",
      "name": "<nom évocateur et client-centrique en français>",
      "description": "<2 phrases : objectif principal de ce portefeuille + pourquoi il correspond à la situation de vie spécifique de ce client>",
      "expected_return": <rendement net annuel attendu en % (ex: 5.2)>,
      "volatility": <volatilité annuelle en % (ex: 7.8)>,
      "sharpe_ratio": <ratio de Sharpe calculé avec taux sans risque 3% (ex: 0.41)>,
      "max_drawdown": <perte maximale estimée en % (ex: 14.0)>,
      "total_mer": <frais totaux pondérés en % (ex: 0.19)>,
      "rationale": "<justification CFA en 4 paragraphes : (1) Objectif IPS — rendement nominal cible, positionnement sur le cycle de vie, contraintes de liquidité identifiées ; (2) Logique de construction — quelles classes d'actifs, pourquoi ces pondérations, quelles corrélations exploitées, quel facteur dominant ; (3) Localisation fiscale — quel ETF dans quel compte, économie fiscale estimée en % ; (4) Adéquation aux objectifs du client — comment ce portefeuille répond concrètement aux buts déclarés>",
      "tax_strategy": "<stratégie fiscale précise ETF par ETF : compte recommandé, justification, économie estimée>",
      "stress_test": {
        "inflation_shock": "<impact sur CE portefeuille : rendement réel estimé, quels actifs protègent, quels actifs souffrent>",
        "market_crash": "<perte estimée en %, délai historique de récupération, rôle des obligations/or comme amortisseurs>",
        "interest_rate_hike": "<sensibilité duration : calcul approximatif de l'impact sur la poche obligataire, impact global>"
      },
      "allocations": [
        {
          "asset_class": "<classe d'actif exacte du tableau>",
          "sub_class": "<sous-classe ou null>",
          "instrument_name": "<nom complet de l'ETF>",
          "instrument_ticker": "<ticker exact du tableau>",
          "weight": <poids en %>,
          "expected_return": <rendement attendu de cet instrument en %>,
          "description": "<rôle précis dans le portefeuille : ex. 'Ancre obligataire — duration 7,5 ans, diversificateur structurel vs actions (corrélation −0,10), protège le capital en période de stress actions'>"
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

  // ── Computed Financial Health Ratios ─────────────────────────
  const netWorth = (clientInfo.total_assets ?? 0) - (clientInfo.total_debts ?? 0);
  const savingsRate =
    clientInfo.annual_income && clientInfo.monthly_savings && clientInfo.annual_income > 0
      ? Math.round(((clientInfo.monthly_savings * 12) / clientInfo.annual_income) * 100)
      : null;
  const debtToIncome =
    clientInfo.annual_income && clientInfo.total_debts && clientInfo.annual_income > 0
      ? Math.round((clientInfo.total_debts / clientInfo.annual_income) * 10) / 10
      : null;
  const monthlySurplus =
    clientInfo.annual_income && clientInfo.monthly_expenses != null && clientInfo.monthly_savings != null
      ? Math.round(clientInfo.annual_income / 12 - clientInfo.monthly_expenses - clientInfo.monthly_savings)
      : null;

  // ── Lifecycle Stage ───────────────────────────────────────────
  const lifecycleStage = !clientInfo.age
    ? null
    : clientInfo.age < 45
    ? { label: 'Accumulation', note: 'Biais actions élevé justifié, capitalisation sur le long terme, DCA régulier, maximiser CELI/REER.' }
    : clientInfo.age < 55
    ? { label: 'Consolidation', note: 'Réduction graduelle du risque, analyse du funding gap retraite, optimisation fiscale active.' }
    : clientInfo.age < 65
    ? { label: 'Pré-retraite', note: 'Risque de séquence des rendements critique — augmenter le coussin défensif, stratégie bucket obligatoire.' }
    : { label: 'Décaissement', note: 'Floor & Upside strategy, revenus réguliers prioritaires, liquidité, optimisation SRG.' };

  // ── Goal Analysis ─────────────────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  interface GoalWithHorizon {
    label: string;
    type: string;
    priority: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
    yearsToGoal: number | null;
    urgency: 'court_terme' | 'moyen_terme' | 'long_terme';
    gap: number;
  }

  const goalsWithHorizon: GoalWithHorizon[] = goals.map(g => {
    let yearsToGoal: number | null = null;
    let urgency: 'court_terme' | 'moyen_terme' | 'long_terme' = 'long_terme';
    if (g.target_date) {
      const t = new Date(g.target_date);
      yearsToGoal = (t.getFullYear() - currentYear) + ((t.getMonth() - currentMonth) / 12);
      if (yearsToGoal < 3) urgency = 'court_terme';
      else if (yearsToGoal < 10) urgency = 'moyen_terme';
      else urgency = 'long_terme';
    }
    const monthsRemaining = yearsToGoal !== null ? yearsToGoal * 12 : null;
    const gap = monthsRemaining !== null && clientInfo.monthly_savings
      ? Math.max(0, g.target_amount - g.current_amount - clientInfo.monthly_savings * monthsRemaining)
      : Math.max(0, g.target_amount - g.current_amount);
    return { ...g, yearsToGoal, urgency, gap };
  });

  const shortTermGoals = goalsWithHorizon.filter(g => g.urgency === 'court_terme');
  const mediumTermGoals = goalsWithHorizon.filter(g => g.urgency === 'moyen_terme');
  const longTermGoals = goalsWithHorizon.filter(g => g.urgency === 'long_terme');

  // ── Build Message ─────────────────────────────────────────────

  let message = `## Profil du client\n`;
  message += `- Âge : ${clientInfo.age ?? 'Non renseigné'}${lifecycleStage ? ` — Phase de vie : **${lifecycleStage.label}**` : ''}\n`;
  message += `- Profession : ${clientInfo.profession ?? 'Non renseigné'}\n`;
  message += `- Situation familiale : ${clientInfo.family_situation ?? 'Non renseigné'}`;
  if (clientInfo.dependents && clientInfo.dependents > 0) message += ` (${clientInfo.dependents} personne(s) à charge)`;
  message += '\n';
  message += `- Expérience d'investissement : ${clientInfo.investment_experience ?? 'Non renseigné'}\n`;
  if (lifecycleStage) {
    message += `- **Implications lifecycle** : ${lifecycleStage.note}\n`;
  }
  message += '\n';

  message += `## Situation financière\n`;
  message += `- Revenu annuel : ${formatMoney(clientInfo.annual_income)}\n`;
  message += `- Dépenses mensuelles : ${formatMoney(clientInfo.monthly_expenses)}\n`;
  message += `- Épargne mensuelle : ${formatMoney(clientInfo.monthly_savings)}`;
  if (savingsRate !== null) message += ` (taux d'épargne : **${savingsRate}%**)`;
  message += '\n';
  message += `- Actifs totaux : ${formatMoney(clientInfo.total_assets)}\n`;
  message += `- Dettes totales : ${formatMoney(clientInfo.total_debts)}\n`;
  message += `- **Valeur nette (patrimoine) : ${formatMoney(netWorth)}**\n`;
  if (debtToIncome !== null) {
    const dtiStatus = debtToIncome < 1.5 ? '✓ sain' : debtToIncome < 3 ? '⚠ modéré' : '⚠ élevé';
    message += `- Ratio dettes/revenu : ${debtToIncome}x (${dtiStatus})\n`;
  }
  if (monthlySurplus !== null) {
    message += `- Surplus mensuel disponible (après dépenses + épargne déclarée) : ${formatMoney(monthlySurplus)}\n`;
  }
  message += `- Tranche d'imposition : ${clientInfo.tax_bracket ?? 'Non renseigné'}\n\n`;

  message += `## Comptes enregistrés\n`;
  if (clientInfo.has_celi) {
    message += `- CELI : ${formatMoney(clientInfo.celi_balance)} (abri fiscal sur gains en capital et dividendes — prioriser actifs de croissance)\n`;
  }
  if (clientInfo.has_reer) {
    message += `- REER : ${formatMoney(clientInfo.reer_balance)} (déductible, imposition au retrait — prioriser ETFs US-listed pour éliminer retenue à la source 15%)\n`;
  }
  if (clientInfo.has_reee) {
    message += `- REEE : ${formatMoney(clientInfo.reee_balance)} (SCEE : 20% sur 2 500 $/an = 500 $/an max — prioriser croissance si horizon > 5 ans, capital protection si < 5 ans)\n`;
  }
  if (!clientInfo.has_celi && !clientInfo.has_reer && !clientInfo.has_reee) {
    message += `- Aucun compte enregistré — recommander prioritairement l'ouverture d'un CELI (cotisation max ~95 000 $ cumulatif 2025 si 18 ans avant 2009)\n`;
  }
  message += '\n';

  message += `## Profil de risque\n`;
  message += `- Score : ${assessment.risk_score ?? 'Non évalué'}/10\n`;
  message += `- Profil : ${assessment.risk_profile ?? 'Non évalué'}\n`;
  if (assessment.key_factors && assessment.key_factors.length > 0) {
    message += `- Facteurs déterminants : ${assessment.key_factors.join(', ')}\n`;
  }
  if (assessment.ai_analysis) {
    const excerpt = assessment.ai_analysis.length > 300
      ? assessment.ai_analysis.slice(0, 300) + '...'
      : assessment.ai_analysis;
    message += `- Analyse : ${excerpt}\n`;
  }
  message += '\n';

  // Goals section with urgency analysis
  if (goals.length > 0) {
    message += `## Objectifs financiers — Analyse par Horizon\n`;

    const printGoal = (g: GoalWithHorizon) => {
      let line = `- **${g.label}** (${g.type}, priorité ${g.priority}) : `;
      line += `cible ${g.target_amount.toLocaleString('fr-CA')} $`;
      if (g.current_amount > 0) {
        const progress = Math.round((g.current_amount / g.target_amount) * 100);
        line += `, accumulé ${g.current_amount.toLocaleString('fr-CA')} $ (${progress}%)`;
      }
      if (g.target_date) {
        line += `, échéance ${g.target_date}`;
        if (g.yearsToGoal !== null) line += ` (${Math.round(g.yearsToGoal * 10) / 10} ans)`;
      }
      if (g.gap > 0) {
        line += ` — gap estimé nécessitant rendement : ${g.gap.toLocaleString('fr-CA')} $`;
      }
      return line + '\n';
    };

    if (shortTermGoals.length > 0) {
      message += `### Court terme (< 3 ans) — ⚠ Sanctuariser en liquidités/obligations court terme\n`;
      shortTermGoals.forEach(g => { message += printGoal(g); });
    }
    if (mediumTermGoals.length > 0) {
      message += `### Moyen terme (3–10 ans) — Obligations moyen terme + fraction actions\n`;
      mediumTermGoals.forEach(g => { message += printGoal(g); });
    }
    if (longTermGoals.length > 0) {
      message += `### Long terme (> 10 ans) — Biais actions justifié\n`;
      longTermGoals.forEach(g => { message += printGoal(g); });
    }
    message += '\n';
  }

  // Investment horizon
  const horizonLines: string[] = [];

  if (clientInfo.age) {
    const yearsToRetirement = 65 - clientInfo.age;
    if (yearsToRetirement > 0) {
      horizonLines.push(`- Retraite (65 ans) : **${yearsToRetirement} ans**`);
    } else {
      horizonLines.push(`- Client déjà à l'âge de la retraite (${clientInfo.age} ans) — horizon de décaissement actif`);
    }
  }

  for (const g of goalsWithHorizon) {
    if (g.target_date && g.yearsToGoal !== null && g.yearsToGoal > 0) {
      horizonLines.push(`- ${g.label} : **${Math.round(g.yearsToGoal * 10) / 10} ans** (${g.target_date})`);
    }
  }

  let primaryHorizon = clientInfo.age ? Math.max(0, 65 - clientInfo.age) : null;
  const goalHorizons = goalsWithHorizon
    .filter(g => g.yearsToGoal !== null && g.yearsToGoal > 0)
    .map(g => g.yearsToGoal as number);
  if (goalHorizons.length > 0) {
    const minGoal = Math.min(...goalHorizons);
    primaryHorizon = primaryHorizon !== null ? Math.min(primaryHorizon, minGoal) : minGoal;
  }

  if (horizonLines.length > 0 || primaryHorizon !== null) {
    message += `## Horizon d'investissement\n`;
    for (const line of horizonLines) message += `${line}\n`;
    if (primaryHorizon !== null) {
      const classification =
        primaryHorizon < 3
          ? 'COURT TERME (< 3 ans) — liquidités et obligations court terme, aucune exposition actions pour ces fonds'
          : primaryHorizon < 7
          ? 'MOYEN TERME (3–7 ans) — équilibre actions/obligations, duration courte à intermédiaire'
          : primaryHorizon < 15
          ? 'LONG TERME (7–15 ans) — biais croissance avec coussin obligataire de protection'
          : 'TRÈS LONG TERME (> 15 ans) — maximiser les équités, la volatilité court terme est absorbée par le temps';
      message += `- **Horizon primaire : ${classification}**\n`;
    }
    message += '\n';
  }

  // IPS Synthesis
  message += `## Synthèse IPS (Énoncé de Politique de Placement)\n`;
  if (assessment.risk_profile) {
    message += `- **Profil de risque cible** : ${assessment.risk_profile} (score ${assessment.risk_score ?? '?'}/10)\n`;
  }
  if (primaryHorizon !== null) {
    message += `- **Horizon dominant** : ${Math.round(primaryHorizon)} ans\n`;
  }
  if (clientInfo.monthly_expenses) {
    const emergencyFundTarget = clientInfo.monthly_expenses * 6;
    message += `- **Fonds d'urgence recommandé** : ${formatMoney(emergencyFundTarget)} (6 mois de dépenses)\n`;
  }
  if (shortTermGoals.length > 0) {
    const shortTermTotal = shortTermGoals.reduce((s, g) => s + Math.max(0, g.target_amount - g.current_amount), 0);
    message += `- **Besoins de liquidité < 3 ans** : ${formatMoney(shortTermTotal)} à sanctuariser en obligations court terme/liquidités\n`;
  }
  const accountsAvailable = [
    clientInfo.has_celi ? 'CELI' : null,
    clientInfo.has_reer ? 'REER' : null,
    clientInfo.has_reee ? 'REEE' : null,
  ].filter(Boolean);
  message += `- **Comptes disponibles pour localisation fiscale** : ${accountsAvailable.length > 0 ? accountsAvailable.join(', ') : 'non-enregistré uniquement'}\n`;
  message += `- **Tranche fiscale** : ${clientInfo.tax_bracket ?? 'inconnue'} — ${
    clientInfo.tax_bracket?.includes('150k') ? 'Optimisation fiscale maximale prioritaire (tranche marginale élevée)' :
    clientInfo.tax_bracket?.includes('100k') ? 'Localisation fiscale REER/CELI très importante' :
    'Localisation fiscale standard'
  }\n`;
  message += '\n';

  message += constraintsSummary;
  message += '\n\nGénère les 3 portefeuilles personnalisés pour ce client en appliquant rigoureusement le processus IPS ci-dessus.';

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
## Tes outils de calcul
Tu as accès à des outils de simulation financière (projections, économies d'impôt, rééquilibrage). Utilise-les dès qu'une question nécessite un chiffre précis — ne devine jamais. Présente les résultats avec une explication simple de ce que ça signifie concrètement pour le client.

## Règles absolues
1. Toujours en français canadien
2. **Toujours basé sur les vraies données du client** — ne jamais inventer un chiffre absent du contexte
3. Si une donnée manque, dis-le clairement : "Je n'ai pas cette info dans ton dossier"
4. Pas de recommandations de titres individuels (actions de compagnies) — uniquement les ETFs du portefeuille
5. Si des données de marché en temps réel sont disponibles, explique concrètement leur impact sur CE portefeuille
6. Termine par un avertissement uniquement si le conseil est très spécifique : *"Note : ceci est à titre informatif. Pour des recommandations officielles, consulte un conseiller financier agréé."*
7. Date du jour : ${new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' })}
${(() => { const m = new Date().getMonth() + 1; return (m === 1 || m === 2) ? '⚠️ SAISON REER : La date limite de cotisation REER est le 1er mars. Mentionne-le si pertinent.' : ''; })()}
${(() => { const m = new Date().getMonth() + 1; return (m === 11 || m === 12) ? "⚠️ FIN D'ANNÉE : Rappelle les stratégies fiscales de fin d'année (récolte des pertes fiscales, maximisation CELI)." : ''; })()}`;
}
