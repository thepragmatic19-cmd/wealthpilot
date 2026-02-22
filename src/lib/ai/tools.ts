import type { Tool } from "@anthropic-ai/sdk/resources/messages";

// ============================================================
// TOOL DEFINITIONS — What Claude can call
// ============================================================

export const AI_TOOLS: Tool[] = [
    {
        name: "simulate_contribution",
        description:
            "Simule l'impact d'une cotisation mensuelle supplémentaire dans un compte d'investissement (CELI, REER, ou non-enregistré). Calcule la valeur future avec intérêts composés et, pour le REER, les économies d'impôt associées.",
        input_schema: {
            type: "object" as const,
            properties: {
                monthly_amount: {
                    type: "number",
                    description: "Montant de la cotisation mensuelle en dollars canadiens",
                },
                account_type: {
                    type: "string",
                    enum: ["CELI", "REER", "non-enregistré"],
                    description: "Type de compte dans lequel cotiser",
                },
                years: {
                    type: "number",
                    description: "Nombre d'années de cotisation (par défaut: jusqu'à la retraite)",
                },
                annual_return: {
                    type: "number",
                    description: "Rendement annuel espéré en % (par défaut: 7)",
                },
            },
            required: ["monthly_amount", "account_type"],
        },
    },
    {
        name: "calculate_tax_savings",
        description:
            "Calcule les économies d'impôt fédéral et provincial (Québec/Ontario) résultant d'une cotisation REER pour un revenu annuel donné. Utilise les tables d'imposition canadiennes 2024.",
        input_schema: {
            type: "object" as const,
            properties: {
                contribution: {
                    type: "number",
                    description: "Montant de la cotisation REER en dollars",
                },
                annual_income: {
                    type: "number",
                    description: "Revenu annuel brut du client en dollars",
                },
                province: {
                    type: "string",
                    enum: ["QC", "ON", "BC", "AB"],
                    description: "Province de résidence (par défaut: QC)",
                },
            },
            required: ["contribution", "annual_income"],
        },
    },
    {
        name: "project_goal",
        description:
            "Projette le temps nécessaire pour atteindre un objectif financier avec des cotisations mensuelles régulières, en tenant compte des intérêts composés et de l'inflation.",
        input_schema: {
            type: "object" as const,
            properties: {
                target_amount: {
                    type: "number",
                    description: "Montant cible de l'objectif en dollars",
                },
                current_amount: {
                    type: "number",
                    description: "Montant déjà accumulé en dollars",
                },
                monthly_contribution: {
                    type: "number",
                    description: "Cotisation mensuelle en dollars",
                },
                annual_return: {
                    type: "number",
                    description: "Rendement annuel espéré en % (par défaut: 7)",
                },
                inflation_rate: {
                    type: "number",
                    description: "Taux d'inflation annuel en % (par défaut: 2.5)",
                },
            },
            required: ["target_amount", "current_amount", "monthly_contribution"],
        },
    },
    {
        name: "calculate_rebalancing",
        description:
            "Calcule les ajustements nécessaires pour rééquilibrer un portefeuille par rapport à ses allocations cibles. Indique combien acheter/vendre de chaque ETF.",
        input_schema: {
            type: "object" as const,
            properties: {
                portfolio_value: {
                    type: "number",
                    description: "Valeur totale actuelle du portefeuille en dollars",
                },
                allocations: {
                    type: "array",
                    description: "Allocations actuelles du portefeuille",
                    items: {
                        type: "object",
                        properties: {
                            ticker: { type: "string", description: "Ticker de l'ETF" },
                            target_weight: { type: "number", description: "Poids cible en %" },
                            current_weight: { type: "number", description: "Poids actuel en %" },
                        },
                        required: ["ticker", "target_weight", "current_weight"],
                    },
                },
            },
            required: ["portfolio_value", "allocations"],
        },
    },
    {
        name: "compare_scenarios",
        description:
            "Compare deux scénarios financiers côte à côte (ex: augmenter les cotisations vs rembourser une dette, CELI vs REER). Retourne une analyse chiffrée avec le meilleur choix.",
        input_schema: {
            type: "object" as const,
            properties: {
                scenario_a: {
                    type: "object",
                    description: "Premier scénario",
                    properties: {
                        name: { type: "string", description: "Nom du scénario A" },
                        monthly_amount: { type: "number", description: "Montant mensuel" },
                        annual_return: { type: "number", description: "Rendement ou taux en %" },
                        years: { type: "number", description: "Durée en années" },
                    },
                    required: ["name", "monthly_amount", "annual_return", "years"],
                },
                scenario_b: {
                    type: "object",
                    description: "Deuxième scénario",
                    properties: {
                        name: { type: "string", description: "Nom du scénario B" },
                        monthly_amount: { type: "number", description: "Montant mensuel" },
                        annual_return: { type: "number", description: "Rendement ou taux en %" },
                        years: { type: "number", description: "Durée en années" },
                    },
                    required: ["name", "monthly_amount", "annual_return", "years"],
                },
            },
            required: ["scenario_a", "scenario_b"],
        },
    },
];

// ============================================================
// TOOL EXECUTION — Process tool calls from Claude
// ============================================================

interface ToolInput {
    [key: string]: unknown;
}

export function executeTool(toolName: string, input: ToolInput): string {
    switch (toolName) {
        case "simulate_contribution":
            return simulateContribution(input);
        case "calculate_tax_savings":
            return calculateTaxSavings(input);
        case "project_goal":
            return projectGoal(input);
        case "calculate_rebalancing":
            return calculateRebalancing(input);
        case "compare_scenarios":
            return compareScenarios(input);
        default:
            return JSON.stringify({ error: `Outil inconnu: ${toolName}` });
    }
}

function simulateContribution(input: ToolInput): string {
    const monthlyAmount = input.monthly_amount as number;
    const accountType = (input.account_type as string) || "CELI";
    const years = (input.years as number) || 25;
    const annualReturn = (input.annual_return as number) || 7;

    const monthlyRate = annualReturn / 100 / 12;
    const months = years * 12;

    // Future value of annuity
    const futureValue =
        monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

    const totalContributed = monthlyAmount * months;
    const totalGrowth = futureValue - totalContributed;

    // Tax advantages
    let taxNote = "";
    if (accountType === "CELI") {
        taxNote = `Tous les gains (${formatCAD(totalGrowth)}) sont libres d'impôt dans un CELI.`;
    } else if (accountType === "REER") {
        const estimatedTaxRate = 0.3; // Average marginal rate
        const annualDeduction = monthlyAmount * 12;
        const annualTaxSavings = annualDeduction * estimatedTaxRate;
        taxNote = `Déduction fiscale estimée: ${formatCAD(annualTaxSavings)}/an. Les retraits seront imposés à la retraite (taux marginal potentiellement plus bas).`;
    } else {
        const taxableGains = totalGrowth * 0.5; // 50% inclusion rate
        taxNote = `Gains imposables (50% d'inclusion): ${formatCAD(taxableGains)}. Considérez un compte enregistré pour optimiser.`;
    }

    return JSON.stringify({
        monthly_contribution: formatCAD(monthlyAmount),
        account_type: accountType,
        duration: `${years} ans`,
        annual_return: `${annualReturn}%`,
        total_contributed: formatCAD(totalContributed),
        future_value: formatCAD(futureValue),
        total_growth: formatCAD(totalGrowth),
        growth_percentage: `${((totalGrowth / totalContributed) * 100).toFixed(0)}%`,
        tax_note: taxNote,
    });
}

function calculateTaxSavings(input: ToolInput): string {
    const contribution = input.contribution as number;
    const annualIncome = input.annual_income as number;
    const province = (input.province as string) || "QC";

    // Federal tax brackets 2024
    const federalRate = getFederalMarginalRate(annualIncome);
    const federalSavings = contribution * federalRate;

    // Provincial tax brackets 2024
    const provincialRate = getProvincialMarginalRate(annualIncome, province);
    const provincialSavings = contribution * provincialRate;

    const totalSavings = federalSavings + provincialSavings;
    const effectiveRate = federalRate + provincialRate;
    const reerMaxContribution = Math.min(annualIncome * 0.18, 32490); // Plafond 2025

    return JSON.stringify({
        contribution: formatCAD(contribution),
        annual_income: formatCAD(annualIncome),
        province,
        federal_marginal_rate: `${(federalRate * 100).toFixed(1)}%`,
        provincial_marginal_rate: `${(provincialRate * 100).toFixed(1)}%`,
        combined_marginal_rate: `${(effectiveRate * 100).toFixed(1)}%`,
        federal_tax_savings: formatCAD(federalSavings),
        provincial_tax_savings: formatCAD(provincialSavings),
        total_tax_savings: formatCAD(totalSavings),
        effective_cost_after_tax: formatCAD(contribution - totalSavings),
        reer_max_contribution: formatCAD(reerMaxContribution),
        remaining_room: formatCAD(Math.max(0, reerMaxContribution - contribution)),
    });
}

function projectGoal(input: ToolInput): string {
    const targetAmount = input.target_amount as number;
    const currentAmount = (input.current_amount as number) || 0;
    const monthlyContribution = input.monthly_contribution as number;
    const annualReturn = (input.annual_return as number) || 7;
    const inflationRate = (input.inflation_rate as number) || 2.5;

    const realReturn = (annualReturn - inflationRate) / 100;
    const monthlyRate = realReturn / 12;
    const remaining = targetAmount - currentAmount;

    if (remaining <= 0) {
        return JSON.stringify({
            message: "🎉 Objectif déjà atteint!",
            current: formatCAD(currentAmount),
            target: formatCAD(targetAmount),
        });
    }

    // Calculate months to goal
    // FV = PV(1+r)^n + PMT * ((1+r)^n - 1) / r = target
    let months = 0;
    let balance = currentAmount;
    while (balance < targetAmount && months < 600) {
        // max 50 years
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        months++;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const totalContributed = monthlyContribution * months;

    // What if they increase by 20%?
    let acceleratedMonths = 0;
    let accBalance = currentAmount;
    const boostedContribution = monthlyContribution * 1.2;
    while (accBalance < targetAmount && acceleratedMonths < 600) {
        accBalance = accBalance * (1 + monthlyRate) + boostedContribution;
        acceleratedMonths++;
    }

    return JSON.stringify({
        target: formatCAD(targetAmount),
        current: formatCAD(currentAmount),
        remaining: formatCAD(remaining),
        monthly_contribution: formatCAD(monthlyContribution),
        time_to_goal: `${years} ans et ${remainingMonths} mois`,
        total_to_contribute: formatCAD(totalContributed),
        growth_from_returns: formatCAD(targetAmount - currentAmount - totalContributed),
        tip: `En augmentant vos cotisations de 20% (${formatCAD(boostedContribution)}/mois), vous atteindriez votre objectif en ${Math.floor(acceleratedMonths / 12)} ans et ${acceleratedMonths % 12} mois.`,
        inflation_adjusted: true,
    });
}

function calculateRebalancing(input: ToolInput): string {
    const portfolioValue = input.portfolio_value as number;
    const allocations = input.allocations as Array<{
        ticker: string;
        target_weight: number;
        current_weight: number;
    }>;

    const suggestions = allocations.map((alloc) => {
        const drift = alloc.current_weight - alloc.target_weight;
        const driftAmount = (drift / 100) * portfolioValue;
        let action = "Maintenir";
        if (Math.abs(drift) > 1) {
            action = drift > 0 ? "Vendre" : "Acheter";
        }

        return {
            ticker: alloc.ticker,
            target_weight: `${alloc.target_weight}%`,
            current_weight: `${alloc.current_weight}%`,
            drift: `${drift > 0 ? "+" : ""}${drift.toFixed(1)}%`,
            action,
            amount: `${action === "Maintenir" ? "—" : formatCAD(Math.abs(driftAmount))}`,
        };
    });

    const totalDrift = allocations.reduce(
        (sum, a) => sum + Math.abs(a.current_weight - a.target_weight),
        0
    );

    return JSON.stringify({
        portfolio_value: formatCAD(portfolioValue),
        total_drift: `${totalDrift.toFixed(1)}%`,
        needs_rebalancing: totalDrift > 5,
        suggestions,
        recommendation:
            totalDrift > 10
                ? "Rééquilibrage fortement recommandé — le portefeuille a significativement dévié de ses cibles."
                : totalDrift > 5
                    ? "Rééquilibrage suggéré — des ajustements mineurs amélioreraient l'alignement avec votre profil de risque."
                    : "Portefeuille bien aligné — aucun rééquilibrage nécessaire pour le moment.",
    });
}

function compareScenarios(input: ToolInput): string {
    const scenarioA = input.scenario_a as {
        name: string;
        monthly_amount: number;
        annual_return: number;
        years: number;
    };
    const scenarioB = input.scenario_b as {
        name: string;
        monthly_amount: number;
        annual_return: number;
        years: number;
    };

    const calcFV = (monthly: number, rate: number, years: number) => {
        const monthlyRate = rate / 100 / 12;
        const months = years * 12;
        return monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    };

    const fvA = calcFV(scenarioA.monthly_amount, scenarioA.annual_return, scenarioA.years);
    const fvB = calcFV(scenarioB.monthly_amount, scenarioB.annual_return, scenarioB.years);
    const totalA = scenarioA.monthly_amount * scenarioA.years * 12;
    const totalB = scenarioB.monthly_amount * scenarioB.years * 12;

    const winner = fvA > fvB ? scenarioA.name : scenarioB.name;
    const difference = Math.abs(fvA - fvB);

    return JSON.stringify({
        scenario_a: {
            name: scenarioA.name,
            monthly: formatCAD(scenarioA.monthly_amount),
            return: `${scenarioA.annual_return}%`,
            years: scenarioA.years,
            total_invested: formatCAD(totalA),
            future_value: formatCAD(fvA),
            gain: formatCAD(fvA - totalA),
        },
        scenario_b: {
            name: scenarioB.name,
            monthly: formatCAD(scenarioB.monthly_amount),
            return: `${scenarioB.annual_return}%`,
            years: scenarioB.years,
            total_invested: formatCAD(totalB),
            future_value: formatCAD(fvB),
            gain: formatCAD(fvB - totalB),
        },
        winner,
        difference: formatCAD(difference),
        recommendation: `Le scénario "${winner}" génère ${formatCAD(difference)} de plus sur la période. Cependant, d'autres facteurs comme la fiscalité et la liquidité doivent être considérés.`,
    });
}

// ============================================================
// HELPERS
// ============================================================

function formatCAD(amount: number): string {
    return new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
    }).format(amount);
}

function getFederalMarginalRate(income: number): number {
    if (income > 235675) return 0.33;
    if (income > 165430) return 0.29;
    if (income > 111733) return 0.26;
    if (income > 55867) return 0.205;
    return 0.15;
}

function getProvincialMarginalRate(income: number, province: string): number {
    switch (province) {
        case "QC":
            if (income > 126000) return 0.2575;
            if (income > 100105) return 0.24;
            if (income > 51780) return 0.19;
            return 0.14;
        case "ON":
            if (income > 220000) return 0.1316;
            if (income > 150000) return 0.1216;
            if (income > 92454) return 0.1116;
            if (income > 51446) return 0.0915;
            return 0.0505;
        case "BC":
            if (income > 252752) return 0.205;
            if (income > 162348) return 0.1680;
            if (income > 104835) return 0.1429;
            if (income > 47937) return 0.077;
            return 0.0506;
        case "AB":
            if (income > 355000) return 0.15;
            if (income > 177000) return 0.14;
            if (income > 148000) return 0.12;
            if (income > 131000) return 0.10;
            return 0.10;
        default:
            return 0.15; // fallback
    }
}
