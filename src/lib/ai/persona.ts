// ════════════════════════════════════════════════════════════════════════════
// PERSONA ENGINE — Client Segmentation & Communication Style
// WealthPilot | CFA-Grade Advisory Layer
// ════════════════════════════════════════════════════════════════════════════

export interface PersonaContext {
    lifeStage: LifeStage;
    stageLabel: string;
    communicationStyle: CommunicationStyle;
    priorityTopics: string[];
    riskLanguage: RiskLanguage;
    urgentActions: string[];
    toneDescriptor: string;
}

export interface Milestone {
    type: MilestoneType;
    label: string;
    urgency: "low" | "normal" | "high" | "urgent";
    actionPrompt: string;
}

export type LifeStage =
    | "accumulation_early"   // 18–30
    | "accumulation_growth"  // 31–45
    | "pre_retirement"       // 46–60
    | "retirement"           // 60+
    | "unknown";

export type CommunicationStyle =
    | "educational"     // jeune investisseur, peu d'expérience
    | "collaborative"   // investisseur intermédiaire, veut comprendre
    | "strategic"       // investisseur avancé, veut de la valeur ajoutée
    | "preservative";   // proche/en retraite, protège son capital

export type RiskLanguage = "prudent" | "équilibré" | "ambitieux";

export type MilestoneType =
    | "celiapp_eligible"
    | "celiapp_deadline"
    | "reer_max_approaching"
    | "celi_room_large"
    | "retirement_near"
    | "goal_near_completion"
    | "goal_at_risk"
    | "debt_free_near"
    | "reee_grant_window"
    | "ferr_conversion_soon"
    | "high_debt_ratio"
    | "low_savings_rate"
    | "emergency_fund_insufficient";

// ─────────────────────────────────────────────────────────────────────────────
// Life Stage Mapping
// ─────────────────────────────────────────────────────────────────────────────

function getLifeStage(age: number | null): LifeStage {
    if (age === null || age <= 0) return "unknown";
    if (age <= 30) return "accumulation_early";
    if (age <= 45) return "accumulation_growth";
    if (age <= 60) return "pre_retirement";
    return "retirement";
}

function getStageLabel(stage: LifeStage): string {
    const labels: Record<LifeStage, string> = {
        accumulation_early: "Phase d'accumulation initiale (18–30 ans)",
        accumulation_growth: "Phase de croissance patrimoniale (31–45 ans)",
        pre_retirement: "Phase de transition retraite (46–60 ans)",
        retirement: "Phase de retraite et décumulation (60+)",
        unknown: "Profil en cours d'évaluation",
    };
    return labels[stage];
}

function getStagePriorityTopics(stage: LifeStage, hasDependents: boolean, hasReee: boolean): string[] {
    const base: Record<LifeStage, string[]> = {
        accumulation_early: [
            "Priorité CELI: croissance libre d'impôt",
            "CELIAPP si achat propriété envisagé dans 5–15 ans",
            "Fonds d'urgence (3–6 mois dépenses)",
            "Remboursement dettes à taux élevé (>5%)",
            "REER secondaire sauf si tranche marginale >40%",
        ],
        accumulation_growth: [
            "Optimisation REER/CELI selon tranche marginale",
            "Protection du revenu (assurance invalidité, vie)",
            "Investissement dans compte non-enregistré si enregistrés maximisés",
            "Stratégie de croissance du patrimoine net",
        ],
        pre_retirement: [
            "Transition vers allocations plus défensives",
            "Maximisation REER avant conversion FERR obligatoire (71 ans)",
            "Planification décumulation optimale (quand vider quoi en premier)",
            "SRV, RRQ — estimation revenus de retraite garantis",
            "Risque de séquence des rendements à atténuer",
        ],
        retirement: [
            "Ordre de retrait optimal (FERR, CELI, non-enregistré)",
            "Fractionnement revenu de retraite (RRQ, FERR) avec conjoint",
            "Preservation du capital, revenu stable",
            "Planification successorale et testament",
            "Sécurité de vieillesse (SV) et Supplément de revenu garanti (SRG)",
        ],
        unknown: [
            "Compléter le profil client pour recommandations personnalisées",
        ],
    };

    const topics = [...base[stage]];
    if (hasDependents && !hasReee && stage !== "retirement") {
        topics.push("REEE: bénéficiez de 20–40% en subventions gouvernementales (SCEE, IQEE)");
    }
    return topics;
}

function getCommunicationStyle(
    age: number | null,
    experience: string | null
): CommunicationStyle {
    const expLower = experience?.toLowerCase() || "";
    if (expLower.includes("avancé") || expLower.includes("expert")) return "strategic";

    const stage = getLifeStage(age);
    if (stage === "retirement") return "preservative";
    if (stage === "pre_retirement") return "strategic";
    if (stage === "accumulation_growth") return "collaborative";
    return "educational"; // accumulation_early or unknown
}

function getRiskLanguage(riskScore: number, riskProfile: string): RiskLanguage {
    if (riskScore >= 7 || riskProfile.toLowerCase().includes("agressif")) return "ambitieux";
    if (riskScore <= 4 || riskProfile.toLowerCase().includes("conserv")) return "prudent";
    return "équilibré";
}

function getToneDescriptor(style: CommunicationStyle, riskLang: RiskLanguage): string {
    const tones: Record<CommunicationStyle, string> = {
        educational: "pédagogique et rassurant — explique les concepts de base avec des exemples concrets et des analogies simples",
        collaborative: "analytique et transparent — partage le raisonnement, valide la compréhension du client, invite aux questions",
        strategic: "direct et axé valeur — va droit au fait, présente les arbitrages clairement, parle en termes de rendement ajusté au risque",
        preservative: "prudent et bienveillant — met l'accent sur la préservation du capital et la certitude des revenus, évite les risques non nécessaires",
    };

    const riskModifier: Record<RiskLanguage, string> = {
        prudent: "Utilise un langage de protection et de certitude.",
        équilibré: "Équilibre opportunités de croissance et gestion du risque.",
        ambitieux: "Met en avant les opportunités de croissance et la performance à long terme.",
    };

    return `${tones[style]} ${riskModifier[riskLang]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone Detection
// ─────────────────────────────────────────────────────────────────────────────

export function detectClientMilestones(clientData: {
    age: number | null;
    annualIncome: number | null;
    monthlySavings: number | null;
    monthlyExpenses: number | null;
    totalAssets: number | null;
    totalDebts: number | null;
    celiBalance: number | null;
    reerBalance: number | null;
    hasCeliapp?: boolean;
    hasDependents: boolean;
    hasReee: boolean;
    riskScore: number;
    goals?: Array<{
        label: string;
        targetAmount: number;
        currentAmount: number;
        targetDate: string | null;
    }>;
}): Milestone[] {
    const milestones: Milestone[] = [];
    const {
        age,
        annualIncome,
        monthlySavings,
        monthlyExpenses,
        totalAssets,
        totalDebts,
        celiBalance,
        reerBalance,
        hasDependents,
        hasReee,
        goals = [],
    } = clientData;

    const income = annualIncome ?? 0;
    const savings = monthlySavings ?? 0;
    const expenses = monthlyExpenses ?? 0;
    const assets = totalAssets ?? 0;
    const debts = totalDebts ?? 0;
    const celi = celiBalance ?? 0;
    const reer = reerBalance ?? 0;

    // CELIAPP eligibility (18–40 ans, non-propriétaire implicite)
    if (age !== null && age >= 18 && age <= 40) {
        milestones.push({
            type: "celiapp_eligible",
            label: "Éligible au CELIAPP",
            urgency: age >= 37 ? "high" : "normal",
            actionPrompt:
                age >= 37
                    ? `⚠️ Fenêtre CELIAPP se ferme à 40 ans — il reste ${40 - age} an(s). Cotisez jusqu'à 8 000$/an (max 40 000$) pour un premier achat immobilier avec déduction ET retraits libres d'impôt.`
                    : `Vous êtes éligible au CELIAPP. Cotisez 8 000$/an (max 40 000$ à vie) pour un achat immobilier futur : déductible comme REER + libre d'impôt comme CELI.`,
        });
    }

    // CELI: large unused room
    const celiCumulativeRoom = age !== null && age >= 18 ? Math.min((age - 17) * 6500, 102000) : null;
    const celiRoom = celiCumulativeRoom !== null ? Math.max(0, celiCumulativeRoom - celi) : null;
    if (celiRoom !== null && celiRoom > 30000) {
        milestones.push({
            type: "celi_room_large",
            label: `${celiRoom.toLocaleString("fr-CA")}$ d'espace CELI inutilisé`,
            urgency: celiRoom > 60000 ? "high" : "normal",
            actionPrompt: `Vous avez ${celiRoom.toLocaleString("fr-CA")}$ d'espace CELI disponible. Chaque dollar cotisé croît et peut être retiré sans impôt — c'est le compte le plus puissant pour l'accumulation de richesse à long terme.`,
        });
    }

    // REER: approaching annual max
    const reerAnnualRoom = income > 0 ? Math.min(Math.round(income * 0.18), 32490) : null;
    if (reerAnnualRoom !== null && reer > 0 && income > 80000) {
        const reerUsed = Math.min(reer, reerAnnualRoom);
        const reerRemaining = reerAnnualRoom - reerUsed;
        if (reerRemaining > 5000) {
            milestones.push({
                type: "reer_max_approaching",
                label: `${reerRemaining.toLocaleString("fr-CA")}$ de déduction REER disponible`,
                urgency: "normal",
                actionPrompt: `Votre espace de cotisation REER annuel estimé est de ${reerAnnualRoom.toLocaleString("fr-CA")}$. Maximiser votre REER avant le 1er mars pourrait réduire votre facture fiscale de plusieurs milliers de dollars.`,
            });
        }
    }

    // Pre-retirement: within 5 years
    if (age !== null && age >= 57 && age < 65) {
        milestones.push({
            type: "retirement_near",
            label: `Retraite dans environ ${65 - age} ans`,
            urgency: age >= 62 ? "high" : "normal",
            actionPrompt: `La retraite approche — il est temps d'établir un plan de décumulation précis : quel ordre de retrait (CELI, REER/FERR, non-enregistré), quand demander la RRQ, et comment protéger contre le risque de séquence des rendements.`,
        });
    }

    // FERR conversion soon (age 69–70)
    if (age !== null && age >= 69 && age <= 70) {
        milestones.push({
            type: "ferr_conversion_soon",
            label: "Conversion REER→FERR obligatoire avant 71 ans",
            urgency: "urgent",
            actionPrompt: `Votre REER doit être converti en FERR avant le 31 décembre de votre 71e année. Planifiez dès maintenant les retraits minimaux obligatoires et leur impact fiscal pour les prochaines années.`,
        });
    }

    // REEE: dependents without REEE
    if (hasDependents && !hasReee) {
        milestones.push({
            type: "reee_grant_window",
            label: "REEE non ouvert — subventions gouvernementales manquées",
            urgency: "high",
            actionPrompt: `Vous avez des enfants à charge mais aucun REEE. La SCEE fédérale offre 20% sur les 2 500$ premiers cotisés (= 500$ gratuits/an par enfant). L'IQEE québécois ajoute 10% supplémentaires. Chaque année sans REEE = argent laissé sur la table.`,
        });
    }

    // Low savings rate
    if (savings > 0 && expenses > 0) {
        const monthlyIncome = income / 12;
        const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : null;
        if (savingsRate !== null && savingsRate < 10) {
            milestones.push({
                type: "low_savings_rate",
                label: `Taux d'épargne faible (${savingsRate.toFixed(0)}%)`,
                urgency: savingsRate < 5 ? "urgent" : "high",
                actionPrompt: `Votre taux d'épargne de ${savingsRate.toFixed(0)}% est inférieur au seuil recommandé de 15–20%. Même une hausse de 200$/mois sur 20 ans à 6% génère +${(200 * ((Math.pow(1.005, 240) - 1) / 0.005)).toLocaleString("fr-CA", { maximumFractionDigits: 0 })}$ de patrimoine additionnel.`,
            });
        }
    }

    // High debt ratio
    if (assets > 0 && debts > 0) {
        const debtRatio = (debts / assets) * 100;
        if (debtRatio > 40) {
            milestones.push({
                type: "high_debt_ratio",
                label: `Ratio dette/actif élevé (${debtRatio.toFixed(0)}%)`,
                urgency: debtRatio > 60 ? "urgent" : "high",
                actionPrompt: `Votre ratio dette/actif de ${debtRatio.toFixed(0)}% est supérieur au seuil critique de 40%. Priorisez le remboursement des dettes à taux élevé avant d'investir en non-enregistré.`,
            });
        }
    }

    // Emergency fund check
    if (expenses > 0) {
        const target = expenses * 3;
        const celi3m = celi; // Use CELI as proxy for liquid savings
        if (celi < target && income < 100000) {
            milestones.push({
                type: "emergency_fund_insufficient",
                label: "Fonds d'urgence potentiellement insuffisant",
                urgency: "normal",
                actionPrompt: `Un fonds d'urgence de 3–6 mois de dépenses (soit ${target.toLocaleString("fr-CA")}–${(target * 2).toLocaleString("fr-CA")}$) devrait être prioritaire avant tout investissement à long terme.`,
            });
        }
    }

    // Goal milestones
    const now = Date.now();
    for (const goal of goals) {
        const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;

        // Near completion (>80%)
        if (progress >= 0.8 && progress < 1) {
            milestones.push({
                type: "goal_near_completion",
                label: `Objectif "${goal.label}" presque atteint (${Math.round(progress * 100)}%)`,
                urgency: "normal",
                actionPrompt: `Votre objectif "${goal.label}" est atteint à ${Math.round(progress * 100)}%. Il reste ${(goal.targetAmount - goal.currentAmount).toLocaleString("fr-CA")}$ à accumuler. Envisagez de sécuriser les gains en déplaçant vers une allocation plus conservatrice.`,
            });
        }

        // At risk: target date within 12 months but <50% achieved
        if (goal.targetDate && progress < 0.5) {
            const daysLeft = (new Date(goal.targetDate).getTime() - now) / (1000 * 60 * 60 * 24);
            if (daysLeft > 0 && daysLeft < 365) {
                milestones.push({
                    type: "goal_at_risk",
                    label: `Objectif "${goal.label}" en danger`,
                    urgency: "urgent",
                    actionPrompt: `L'objectif "${goal.label}" (${goal.targetAmount.toLocaleString("fr-CA")}$) n'est atteint qu'à ${Math.round(progress * 100)}% et l'échéance est dans ${Math.round(daysLeft)} jours. Une révision du plan d'épargne ou de l'objectif s'impose.`,
                });
            }
        }
    }

    return milestones;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Persona Builder
// ─────────────────────────────────────────────────────────────────────────────

export function buildClientPersonaContext(clientData: {
    age: number | null;
    investmentExperience: string | null;
    riskScore: number;
    riskProfile: string;
    hasDependents: boolean;
    hasReee: boolean;
    annualIncome: number | null;
    totalDebts: number | null;
    totalAssets: number | null;
    monthlySavings: number | null;
    monthlyExpenses: number | null;
    celiBalance: number | null;
    reerBalance: number | null;
}): PersonaContext {
    const stage = getLifeStage(clientData.age);
    const commStyle = getCommunicationStyle(clientData.age, clientData.investmentExperience);
    const riskLang = getRiskLanguage(clientData.riskScore, clientData.riskProfile);
    const tone = getToneDescriptor(commStyle, riskLang);
    const priorities = getStagePriorityTopics(stage, clientData.hasDependents, clientData.hasReee);

    const urgentActions: string[] = [];

    // Quick urgent action signals
    if (clientData.totalDebts && clientData.totalAssets) {
        const debtRatio = clientData.totalDebts / clientData.totalAssets;
        if (debtRatio > 0.5) urgentActions.push("Réduire le ratio dette/actif en priorité");
    }
    if (clientData.hasDependents && !clientData.hasReee) {
        urgentActions.push("Ouvrir un REEE et capter les subventions gouvernementales");
    }
    if (clientData.age !== null && clientData.age >= 69 && clientData.age <= 70) {
        urgentActions.push("Planifier la conversion REER → FERR avant 71 ans");
    }

    return {
        lifeStage: stage,
        stageLabel: getStageLabel(stage),
        communicationStyle: commStyle,
        priorityTopics: priorities,
        riskLanguage: riskLang,
        urgentActions,
        toneDescriptor: tone,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor Identity / Signature
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdvisorIdentity(): string {
    return `Alexandre Moreau, CFA, CIWM — Directeur de portefeuille senior, WealthPilot
Certifié CFA (Chartered Financial Analyst) par le CFA Institute
Certifié CIWM (Canadian Investment Wealth Management) par l'Institut canadien des valeurs mobilières
Spécialisation : gestion de portefeuille, planification fiscale canadienne (CELI, REER, REEE, CELIAPP), planification de retraite et décumulation`;
}
