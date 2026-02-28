// ============================================================
// TOOL DEFINITIONS — CFA-Grade Financial Tools
// ============================================================

export const AI_TOOLS = [
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
        name: "analyze_portfolio_risk",
        description:
            "Analyse les métriques de risque CFA d'un portefeuille : VaR 95%, ratio de Sharpe estimé, concentration sectorielle, et flag si un titre dépasse 25% du portefeuille (risque non-compensé).",
        input_schema: {
            type: "object" as const,
            properties: {
                portfolio_value: {
                    type: "number",
                    description: "Valeur totale du portefeuille en dollars",
                },
                expected_return: {
                    type: "number",
                    description: "Rendement annuel attendu en % (ex: 7)",
                },
                volatility: {
                    type: "number",
                    description: "Volatilité annuelle (écart-type) en % (ex: 12)",
                },
                allocations: {
                    type: "array",
                    description: "Liste des positions du portefeuille",
                    items: {
                        type: "object",
                        properties: {
                            ticker: { type: "string", description: "Symbole du titre ou FNB" },
                            asset_class: { type: "string", description: "Classe d'actif (ex: Actions CA, Obligations)" },
                            weight: { type: "number", description: "Poids en % du portefeuille" },
                        },
                        required: ["ticker", "weight"],
                    },
                },
                risk_free_rate: {
                    type: "number",
                    description: "Taux sans risque en % (par défaut: taux obligataire CA 10 ans ~3.5%)",
                },
            },
            required: ["portfolio_value", "expected_return", "volatility"],
        },
    },
    {
        name: "optimize_tax_strategy",
        description:
            "Recommande la stratégie fiscale optimale pour un investisseur canadien : choix CELI vs REER selon la tranche marginale, placement des actifs dans les bons comptes (asset location), et identification des occasions de récupération de pertes fiscales.",
        input_schema: {
            type: "object" as const,
            properties: {
                annual_income: {
                    type: "number",
                    description: "Revenu annuel brut actuel en dollars",
                },
                expected_retirement_income: {
                    type: "number",
                    description: "Revenu annuel estimé à la retraite en dollars (pour comparer les tranches)",
                },
                province: {
                    type: "string",
                    enum: ["QC", "ON", "BC", "AB"],
                    description: "Province de résidence",
                },
                celi_balance: {
                    type: "number",
                    description: "Solde actuel du CELI en dollars",
                },
                reer_balance: {
                    type: "number",
                    description: "Solde actuel du REER en dollars",
                },
                has_us_holdings: {
                    type: "boolean",
                    description: "Le client détient-il des FNB ou actions américains? (important pour l'optimisation des retenues à la source)",
                },
                has_canadian_dividends: {
                    type: "boolean",
                    description: "Le portefeuille inclut-il des actions ou FNB à dividendes canadiens?",
                },
            },
            required: ["annual_income", "province"],
        },
    },
    {
        name: "monte_carlo_retirement",
        description:
            "Simulation Monte Carlo de la retraite (1 000 scénarios) : calcule la probabilité de ne pas manquer d'argent à 90 ans, le taux de retrait sécuritaire, et les années de réserve moyennes. Prend en compte l'inflation, la volatilité des marchés et les revenus garantis (RRQ, SV).",
        input_schema: {
            type: "object" as const,
            properties: {
                current_age: {
                    type: "number",
                    description: "Âge actuel du client",
                },
                retirement_age: {
                    type: "number",
                    description: "Âge de retraite cible (par défaut: 65)",
                },
                current_portfolio_value: {
                    type: "number",
                    description: "Valeur actuelle du portefeuille de retraite en dollars",
                },
                monthly_savings: {
                    type: "number",
                    description: "Épargne mensuelle jusqu'à la retraite en dollars",
                },
                desired_monthly_income: {
                    type: "number",
                    description: "Revenu mensuel net désiré à la retraite en dollars",
                },
                guaranteed_monthly_income: {
                    type: "number",
                    description: "Revenus mensuels garantis à la retraite (RRQ + SV estimés) en dollars",
                },
                expected_return: {
                    type: "number",
                    description: "Rendement annuel moyen attendu du portefeuille en % (par défaut: 6)",
                },
                volatility: {
                    type: "number",
                    description: "Volatilité annuelle du portefeuille en % (par défaut: 10)",
                },
                inflation_rate: {
                    type: "number",
                    description: "Taux d'inflation annuel en % (par défaut: 2.5)",
                },
            },
            required: ["current_age", "current_portfolio_value", "desired_monthly_income"],
        },
    },
    {
        name: "debt_payoff_optimizer",
        description:
            "Compare la stratégie d'avalanche (dettes au taux le plus élevé en premier) vs boule de neige (petites dettes en premier) pour rembourser les dettes d'un client. Calcule les intérêts économisés, la date de remboursement, et les flux de trésorerie libérés.",
        input_schema: {
            type: "object" as const,
            properties: {
                debts: {
                    type: "array",
                    description: "Liste des dettes du client",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Nom ou type de la dette (ex: Prêt auto, Carte de crédit)" },
                            balance: { type: "number", description: "Solde restant en dollars" },
                            interest_rate: { type: "number", description: "Taux d'intérêt annuel en %" },
                            minimum_payment: { type: "number", description: "Paiement mensuel minimum en dollars" },
                        },
                        required: ["name", "balance", "interest_rate", "minimum_payment"],
                    },
                },
                extra_monthly_payment: {
                    type: "number",
                    description: "Montant supplémentaire disponible chaque mois pour accélérer le remboursement",
                },
            },
            required: ["debts"],
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
        case "analyze_portfolio_risk":
            return analyzePortfolioRisk(input);
        case "optimize_tax_strategy":
            return optimizeTaxStrategy(input);
        case "monte_carlo_retirement":
            return monteCarloRetirement(input);
        case "debt_payoff_optimizer":
            return debtPayoffOptimizer(input);
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
// NEW CFA-GRADE TOOLS
// ============================================================

function analyzePortfolioRisk(input: ToolInput): string {
    const portfolioValue = input.portfolio_value as number;
    const expectedReturn = (input.expected_return as number) || 7;
    const volatility = (input.volatility as number) || 12;
    const riskFreeRate = (input.risk_free_rate as number) || 3.5;
    const allocations = (input.allocations as Array<{ ticker: string; asset_class?: string; weight: number }>) || [];

    // Value at Risk (95% confidence, 1-year, parametric normal distribution)
    // VaR = Portfolio × (μ - 1.645σ)
    const zScore95 = 1.645;
    const varPercent = expectedReturn / 100 - zScore95 * (volatility / 100);
    const var1Year = portfolioValue * Math.max(0, -varPercent);
    const varPercent95 = Math.max(0, -(expectedReturn - zScore95 * volatility));

    // Conditional VaR (CVaR / Expected Shortfall) — approx: CVaR ≈ 1.25 × VaR for normal dist.
    const cvar1Year = var1Year * 1.25;

    // Sharpe Ratio
    const sharpe = ((expectedReturn - riskFreeRate) / volatility);

    // Concentration risk
    const concentrationAlerts: string[] = [];
    const largePositions = allocations.filter(a => a.weight > 25);
    if (largePositions.length > 0) {
        for (const pos of largePositions) {
            concentrationAlerts.push(
                `${pos.ticker} représente ${pos.weight}% du portefeuille — risque de concentration non-compensé (seuil CFA: 25%)`
            );
        }
    }

    // Diversification score (simple: number of distinct allocations)
    const diversificationScore = allocations.length >= 7 ? 'Bien diversifié' :
        allocations.length >= 4 ? 'Diversification modérée' : 'Concentration élevée — diversification recommandée';

    // Risk classification
    const riskClass = volatility < 8 ? 'Faible (conservateur)' :
        volatility < 14 ? 'Modéré (équilibré)' :
            volatility < 20 ? 'Élevé (croissance)' : 'Très élevé (agressif)';

    return JSON.stringify({
        portfolio_value: formatCAD(portfolioValue),
        risk_class: riskClass,
        metrics: {
            expected_return: `${expectedReturn}%`,
            annualized_volatility: `${volatility}%`,
            sharpe_ratio: sharpe.toFixed(2),
            sharpe_interpretation: sharpe >= 1 ? 'Excellent (>1.0)' : sharpe >= 0.5 ? 'Acceptable (0.5–1.0)' : 'Insuffisant (<0.5) — revoyez le portefeuille',
        },
        var_95: {
            amount: formatCAD(var1Year),
            percent: `${varPercent95.toFixed(1)}%`,
            interpretation: `Avec 95% de confiance, la perte maximale sur 1 an ne devrait pas dépasser ${formatCAD(var1Year)} (${varPercent95.toFixed(1)}% du portefeuille).`,
        },
        cvar_95: {
            amount: formatCAD(cvar1Year),
            interpretation: `En cas de scénario extrême défavorable (queue de distribution), la perte moyenne attendue serait d'environ ${formatCAD(cvar1Year)}.`,
        },
        concentration_risk: {
            alerts: concentrationAlerts,
            diversification: diversificationScore,
            status: concentrationAlerts.length > 0 ? '⚠️ Risques de concentration détectés' : '✓ Concentration acceptable',
        },
        recommendation: sharpe < 0.5
            ? 'Le ratio de Sharpe insuffisant suggère que le risque pris n\'est pas adéquatement rémunéré. Envisagez de revoir l\'allocation pour améliorer le rendement ajusté au risque.'
            : concentrationAlerts.length > 0
                ? 'Réduisez les positions concentrées pour éliminer le risque idiosyncratique non-rémunéré tout en maintenant votre exposition souhaitée.'
                : 'Le portefeuille présente un profil risque/rendement acceptable. Maintenez le cap et rééquilibrez annuellement.',
    });
}

function optimizeTaxStrategy(input: ToolInput): string {
    const annualIncome = input.annual_income as number;
    const expectedRetirementIncome = (input.expected_retirement_income as number) || annualIncome * 0.6;
    const province = (input.province as string) || 'QC';
    const celiBalance = (input.celi_balance as number) || 0;
    const reerBalance = (input.reer_balance as number) || 0;
    const hasUsHoldings = (input.has_us_holdings as boolean) || false;
    const hasCanadianDividends = (input.has_canadian_dividends as boolean) || false;

    const currentFederalRate = getFederalMarginalRate(annualIncome);
    const currentProvincialRate = getProvincialMarginalRate(annualIncome, province);
    const currentMarginalRate = (currentFederalRate + currentProvincialRate) * 100;

    const retirementFederalRate = getFederalMarginalRate(expectedRetirementIncome);
    const retirementProvincialRate = getProvincialMarginalRate(expectedRetirementIncome, province);
    const retirementMarginalRate = (retirementFederalRate + retirementProvincialRate) * 100;

    // REER vs CELI recommendation
    const reerVsCeli = currentMarginalRate > retirementMarginalRate
        ? { winner: 'REER', reason: `Votre tranche marginale actuelle (${currentMarginalRate.toFixed(1)}%) est plus élevée que votre tranche estimée à la retraite (${retirementMarginalRate.toFixed(1)}%). Chaque dollar de cotisation REER rapporte ${formatCAD(1 * (currentMarginalRate / 100))} de remboursement d\'impôt aujourd\'hui.` }
        : currentMarginalRate === retirementMarginalRate
            ? { winner: 'CELI', reason: `Votre tranche marginale est similaire maintenant (${currentMarginalRate.toFixed(1)}%) et à la retraite (${retirementMarginalRate.toFixed(1)}%). Favorisez le CELI pour sa flexibilité et l\'absence d\'impôt sur les retraits.` }
            : { winner: 'CELI', reason: `Votre tranche marginale maintenant (${currentMarginalRate.toFixed(1)}%) est inférieure à celle estimée à la retraite (${retirementMarginalRate.toFixed(1)}%). Le CELI est préférable — les retraits seront libres d\'impôt même dans une tranche plus élevée.` };

    // Asset location optimization
    const assetLocation: string[] = [
        'Actions canadiennes à dividendes → Non-enregistré (crédit d\'impôt pour dividendes)',
        'Obligations et GIC → REER/FERR (revenus d\'intérêt pleinement imposables, mieux protégés)',
        'FNB d\'actions mondiales à croissance (gains cap) → CELI (croissance libre d\'impôt)',
    ];

    if (hasUsHoldings) {
        assetLocation.push('FNB américains (ex: VTI) → REER recommandé (traité CA-US: retenue 0% sur dividendes US dans REER, vs 15% dans CELI)');
    }
    if (hasCanadianDividends) {
        assetLocation.push('Dividendes CA → Idéalement en non-enregistré pour bénéficier du crédit d\'impôt pour dividendes (taux effectif inférieur aux intérêts)');
    }

    // CELI available room estimate
    const celiMaxEstimate = 102000; // cumulative 2025
    const celiRoom = Math.max(0, celiMaxEstimate - celiBalance);

    // REER available
    const reerAnnualRoom = Math.min(annualIncome * 0.18, 32490);

    // Tax-loss harvesting opportunity note
    const taxLossNote = 'Décembre est la meilleure période pour la récolte de pertes fiscales. Vendez les titres en perte, récoltez la perte pour réduire vos gains en capital, et rachetez un titre similaire (mais pas identique — règle de superficie de 30 jours).';

    return JSON.stringify({
        current_situation: {
            marginal_rate: `${currentMarginalRate.toFixed(1)}%`,
            retirement_marginal_rate_estimate: `${retirementMarginalRate.toFixed(1)}%`,
        },
        reer_vs_celi: reerVsCeli,
        annual_contribution_room: {
            celi_available_room: formatCAD(celiRoom),
            reer_estimated_annual_room: formatCAD(reerAnnualRoom),
            reer_tax_savings_if_maximized: formatCAD(reerAnnualRoom * (currentMarginalRate / 100)),
        },
        asset_location_optimization: assetLocation,
        tax_loss_harvesting: taxLossNote,
        summary: `Stratégie recommandée : ${reerVsCeli.winner} en priorité. ${reerVsCeli.reason}`,
    });
}

function monteCarloRetirement(input: ToolInput): string {
    const currentAge = input.current_age as number;
    const retirementAge = (input.retirement_age as number) || 65;
    const currentPortfolioValue = input.current_portfolio_value as number;
    const monthlySavings = (input.monthly_savings as number) || 0;
    const desiredMonthlyIncome = input.desired_monthly_income as number;
    const guaranteedMonthlyIncome = (input.guaranteed_monthly_income as number) || 0;
    const expectedReturn = (input.expected_return as number) || 6;
    const volatility = (input.volatility as number) || 10;
    const inflationRate = (input.inflation_rate as number) || 2.5;
    const lifeExpectancy = 90;

    const yearsToRetirement = Math.max(0, retirementAge - currentAge);
    const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge);
    const monthlyReturn = expectedReturn / 100 / 12;
    const monthlyVolatility = volatility / 100 / Math.sqrt(12);
    const monthlyInflation = inflationRate / 100 / 12;

    // Accumulation phase: project portfolio at retirement
    const portfolioAtRetirement = currentPortfolioValue * Math.pow(1 + monthlyReturn, yearsToRetirement * 12)
        + monthlySavings * ((Math.pow(1 + monthlyReturn, yearsToRetirement * 12) - 1) / monthlyReturn);

    // Monthly portfolio withdrawal need (net of guaranteed income)
    const netMonthlyNeed = Math.max(0, desiredMonthlyIncome - guaranteedMonthlyIncome);
    const realMonthlyReturn = monthlyReturn - monthlyInflation;

    // Safe withdrawal rate (simplified — 4% rule adjusted)
    const safeWithdrawalRate = yearsInRetirement > 30 ? 3.5 : 4.0;
    const safeMonthlyWithdrawal = (portfolioAtRetirement * safeWithdrawalRate / 100) / 12;

    // Monte Carlo — 1000 simulations (simplified using normal distribution approximation)
    const SIMULATIONS = 1000;
    let successCount = 0;
    const finalBalances: number[] = [];

    for (let sim = 0; sim < SIMULATIONS; sim++) {
        let balance = portfolioAtRetirement;
        let survived = true;

        for (let month = 0; month < yearsInRetirement * 12; month++) {
            // Box-Muller transform for normal random number
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const monthReturn = monthlyReturn + monthlyVolatility * z;

            balance = balance * (1 + monthReturn) - netMonthlyNeed * Math.pow(1 + monthlyInflation, month);

            if (balance <= 0) {
                survived = false;
                break;
            }
        }

        if (survived) {
            successCount++;
            finalBalances.push(balance);
        } else {
            finalBalances.push(0);
        }
    }

    const successRate = Math.round((successCount / SIMULATIONS) * 100);
    const medianFinalBalance = finalBalances.sort((a, b) => a - b)[Math.floor(SIMULATIONS / 2)];
    const avgFinalBalance = finalBalances.reduce((s, v) => s + v, 0) / SIMULATIONS;

    const successInterpretation = successRate >= 90
        ? `✓ Excellent — ${successRate}% de probabilité de succès sur ${yearsInRetirement} ans`
        : successRate >= 75
            ? `⚠️ Acceptable — ${successRate}% de probabilité. Envisagez d\'augmenter l\'épargne ou de réduire les retraits.`
            : `🚨 Insuffisant — ${successRate}% de probabilité. Une révision majeure du plan de retraite est nécessaire.`;

    return JSON.stringify({
        simulation_parameters: {
            iterations: SIMULATIONS,
            current_age: currentAge,
            retirement_age: retirementAge,
            life_expectancy: lifeExpectancy,
            years_to_retirement: yearsToRetirement,
            years_in_retirement: yearsInRetirement,
        },
        accumulation_phase: {
            current_portfolio: formatCAD(currentPortfolioValue),
            monthly_savings: formatCAD(monthlySavings),
            projected_portfolio_at_retirement: formatCAD(portfolioAtRetirement),
        },
        retirement_income: {
            desired_monthly: formatCAD(desiredMonthlyIncome),
            guaranteed_monthly: formatCAD(guaranteedMonthlyIncome),
            portfolio_withdrawal_needed: formatCAD(netMonthlyNeed),
            safe_monthly_withdrawal: formatCAD(safeMonthlyWithdrawal),
            sustainable: safeMonthlyWithdrawal >= netMonthlyNeed,
        },
        monte_carlo_results: {
            success_rate: `${successRate}%`,
            success_count: `${successCount}/${SIMULATIONS} scénarios`,
            interpretation: successInterpretation,
            median_balance_at_90: formatCAD(medianFinalBalance),
            safe_withdrawal_rate_used: `${safeWithdrawalRate}% (règle adaptée à ${yearsInRetirement} ans de retraite)`,
        },
        recommendation: successRate < 85
            ? `Pour atteindre 90% de probabilité de succès, envisagez : (1) augmenter l\'épargne mensuelle de ${formatCAD(Math.max(0, netMonthlyNeed - safeMonthlyWithdrawal))}, (2) retarder la retraite de 1-2 ans, ou (3) réduire le revenu cible de retraite.`
            : `Votre plan de retraite est solide. Continuez sur la même trajectoire et réévaluez annuellement pour intégrer les changements de marché et de situation personnelle.`,
    });
}

function debtPayoffOptimizer(input: ToolInput): string {
    interface Debt {
        name: string;
        balance: number;
        interest_rate: number;
        minimum_payment: number;
    }

    const debts = (input.debts as Debt[]) || [];
    const extraPayment = (input.extra_monthly_payment as number) || 0;

    if (debts.length === 0) {
        return JSON.stringify({ error: 'Aucune dette fournie.' });
    }

    const totalMinimums = debts.reduce((s, d) => s + d.minimum_payment, 0);
    const totalPayment = totalMinimums + extraPayment;
    const totalBalance = debts.reduce((s, d) => s + d.balance, 0);

    // ── Avalanche (highest rate first) ────────────────────────────────────
    const calcPayoffMonths = (debtsArr: Debt[], strategy: 'rate' | 'balance'): { months: number; totalInterest: number } => {
        const working = debtsArr.map(d => ({ ...d }));
        const sorted = strategy === 'rate'
            ? working.sort((a, b) => b.interest_rate - a.interest_rate)
            : working.sort((a, b) => a.balance - b.balance);

        let months = 0;
        let totalInterest = 0;
        const maxMonths = 600;

        while (sorted.some(d => d.balance > 0) && months < maxMonths) {
            months++;
            let remaining = totalPayment;

            // Pay minimums first
            for (const d of sorted) {
                if (d.balance <= 0) continue;
                const interest = d.balance * (d.interest_rate / 100 / 12);
                totalInterest += interest;
                d.balance += interest;
                const minPay = Math.min(d.minimum_payment, d.balance);
                d.balance -= minPay;
                remaining -= minPay;
            }

            // Apply extra to first non-zero debt (sorted by strategy)
            for (const d of sorted) {
                if (d.balance <= 0 || remaining <= 0) continue;
                const applied = Math.min(remaining, d.balance);
                d.balance -= applied;
                remaining -= applied;
            }
        }

        return { months, totalInterest };
    };

    const avalanche = calcPayoffMonths(debts, 'rate');
    const snowball = calcPayoffMonths(debts, 'balance');

    const interestSaved = Math.abs(snowball.totalInterest - avalanche.totalInterest);
    const winner = avalanche.totalInterest <= snowball.totalInterest ? 'Avalanche' : 'Boule de neige';

    const fmtMonths = (m: number) => `${Math.floor(m / 12)} ans et ${m % 12} mois`;

    const debtsSummary = debts
        .sort((a, b) => b.interest_rate - a.interest_rate)
        .map(d => `- ${d.name}: ${formatCAD(d.balance)} @ ${d.interest_rate}%`)
        .join('\n');

    return JSON.stringify({
        total_debt: formatCAD(totalBalance),
        total_monthly_payment: formatCAD(totalPayment),
        debts_by_rate: debtsSummary,
        strategies: {
            avalanche: {
                description: 'Rembourse la dette au taux le plus élevé en premier — mathématiquement optimal',
                payoff_time: fmtMonths(avalanche.months),
                total_interest: formatCAD(avalanche.totalInterest),
            },
            snowball: {
                description: 'Rembourse la plus petite dette en premier — psychologiquement motivant',
                payoff_time: fmtMonths(snowball.months),
                total_interest: formatCAD(snowball.totalInterest),
            },
        },
        recommended_strategy: winner,
        interest_saved_with_avalanche: formatCAD(interestSaved),
        cash_flow_after_debt_free: formatCAD(totalPayment),
        recommendation: `La stratégie **${winner}** est recommandée. En choisissant l'avalanche plutôt que la boule de neige, vous économisez ${formatCAD(interestSaved)} en intérêts. Une fois libre de dettes, les ${formatCAD(totalPayment)}/mois actuellement alloués au remboursement pourront être redirigés vers vos investissements.`,
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
