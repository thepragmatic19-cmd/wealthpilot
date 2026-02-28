"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
    Calculator,
    TrendingUp,
    RefreshCw,
    Info,
    Crown,
    Sparkles,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useSubscription } from "@/hooks/use-subscription";
import { useSimpleMode } from "@/contexts/simple-mode-context";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { FloatingHelpButton } from "@/components/ui/floating-help-button";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
} from "recharts";

const DEFAULT_PARAMS = {
    currentAge: 30,
    retirementAge: 65,
    lifeExpectancy: 90,
    currentSavings: 50000,
    monthlyContribution: 1000,
    monthlyExpenses: 3000,
    expectedReturn: 7,
    inflationRate: 2.5,
    portfolioVolatility: 12,
    rrspBalance: 25000,
    tfsaBalance: 20000,
    governmentPension: 15000,
    withdrawalTaxRate: 30,
};

interface SimulationResult {
    year: number;
    age: number;
    nominal: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
}

function runMonteCarlo(
    params: typeof DEFAULT_PARAMS,
    numSimulations: number = 500
): SimulationResult[] {
    const years = params.retirementAge - params.currentAge;
    const yearlyContribution = params.monthlyContribution * 12;
    const realReturn = (params.expectedReturn - params.inflationRate) / 100;
    const volatility = params.portfolioVolatility / 100;

    const allPaths: number[][] = [];
    for (let sim = 0; sim < numSimulations; sim++) {
        const path: number[] = [params.currentSavings];
        let balance = params.currentSavings;

        for (let y = 0; y < years; y++) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const annualReturn = realReturn + volatility * z;

            balance = balance * (1 + annualReturn) + yearlyContribution;
            if (balance < 0) balance = 0;
            path.push(balance);
        }
        allPaths.push(path);
    }

    const results: SimulationResult[] = [];
    for (let y = 0; y <= years; y++) {
        const values = allPaths.map((p) => p[y]).sort((a, b) => a - b);
        const getPercentile = (pct: number) => values[Math.floor(values.length * pct / 100)] || 0;

        results.push({
            year: y,
            age: params.currentAge + y,
            nominal: params.currentSavings * Math.pow(1 + realReturn, y) + yearlyContribution * ((Math.pow(1 + realReturn, y) - 1) / realReturn),
            p10: getPercentile(10),
            p25: getPercentile(25),
            p50: getPercentile(50),
            p75: getPercentile(75),
            p90: getPercentile(90),
        });
    }

    return results;
}


// Calculate estimated RRQ/RPC annual benefit (simplified formula)
// Based on: ~25% of average career income, capped at ~$16,375/year (2026 max)
function estimateRRQ(annualIncome: number, currentAge: number, retirementAge: number): number {
    const RRQ_MAX_ANNUAL = 16375; // 2026 approximate maximum
    const RRQ_ACCRUAL_RATE = 0.0125; // 1.25% per year of earnings (simplified QPP/CPP formula)
    const yearsContributing = Math.max(0, retirementAge - 18); // assume contributions from age 18
    const yearsWorked = Math.max(0, currentAge - 18);
    // Estimated average earnings (assume current income was earned over career)
    const avgEarnings = Math.min(annualIncome, 73200); // YMPE 2026 approximate
    const estimatedBenefit = avgEarnings * RRQ_ACCRUAL_RATE * Math.min(yearsContributing, 40);
    // Adjust for early/late start (actuarial factor: -0.6%/month before 65, +0.7%/month after)
    const ageAdjustment = retirementAge !== 65 ? 1 + (retirementAge - 65) * 12 * (retirementAge < 65 ? -0.006 : 0.007) : 1;
    return Math.min(estimatedBenefit * Math.max(0.36, ageAdjustment), RRQ_MAX_ANNUAL);
}

// Calculate estimated PSV/OAS annual benefit
function estimatePSV(retirementAge: number): number {
    const PSV_AT_65 = 8000; // ~$667/month at 65 (2026 estimate)
    const PSV_DEFERRAL_BONUS = 0.006; // 0.6%/month deferral after 65 (max at 70)
    if (retirementAge < 65) return 0; // OAS only starts at 65
    const deferralMonths = Math.min((retirementAge - 65) * 12, 60); // max 5 years deferral
    return PSV_AT_65 * (1 + deferralMonths * PSV_DEFERRAL_BONUS);
}

interface GouvPensionEstimate {
    rrq: number;
    psv: number;
    total: number;
    source: "auto" | "manual";
}

export default function RetirementPage() {
    const [params, setParams] = useState(DEFAULT_PARAMS);
    const [simKey, setSimKey] = useState(0);
    const [pensionEstimate, setPensionEstimate] = useState<GouvPensionEstimate | null>(null);
    const [pensionOverridden, setPensionOverridden] = useState(false);
    const { canAccess, isLoading: subLoading } = useSubscription();
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const { isSimple } = useSimpleMode();

    const updateParam = useCallback((key: keyof typeof DEFAULT_PARAMS, value: number) => {
        setParams((prev) => {
            const next = { ...prev, [key]: value };
            // Re-compute pension estimate when age or retirement age changes (if not manually overridden)
            return next;
        });
        if (key === "governmentPension") setPensionOverridden(true);
    }, []);

    useEffect(() => {
        async function loadUserData() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [{ data: portfolio }, { data: ci }] = await Promise.all([
                supabase.from("portfolios").select("volatility").eq("user_id", user.id).eq("is_selected", true).maybeSingle(),
                supabase.from("client_info").select("age,annual_income").eq("user_id", user.id).maybeSingle(),
            ]);

            if (portfolio?.volatility) {
                updateParam("portfolioVolatility", portfolio.volatility);
            }
            // Auto-populate age from profile
            if (ci?.age) {
                setParams((prev) => ({ ...prev, currentAge: ci.age as number }));
            }
            // Compute RRQ/PSV estimates
            const age = ci?.age ?? DEFAULT_PARAMS.currentAge;
            const income = Number(ci?.annual_income) || 0;
            if (income > 0) {
                const retAge = DEFAULT_PARAMS.retirementAge;
                const rrq = estimateRRQ(income, age, retAge);
                const psv = estimatePSV(retAge);
                const total = rrq + psv;
                setPensionEstimate({ rrq, psv, total, source: "auto" });
                setParams((prev) => ({ ...prev, governmentPension: Math.round(total) }));
            }
        }
        loadUserData();
    }, [updateParam]);

    const results = useMemo(() => {
        return runMonteCarlo(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params, simKey]);

    const finalMedian = results[results.length - 1]?.p50 || 0;
    const yearsInRetirement = params.lifeExpectancy - params.retirementAge;
    const annualWithdrawal = yearsInRetirement > 0 ? finalMedian / yearsInRetirement : 0;
    const grossMonthlyIncome = annualWithdrawal / 12 + params.governmentPension / 12;
    const monthlyTax = grossMonthlyIncome * (params.withdrawalTaxRate / 100);
    const afterTaxMonthlyIncome = grossMonthlyIncome - monthlyTax;
    const fireNumber = params.monthlyExpenses * 12 * 25;

    if (subLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="h-96 animate-pulse rounded-lg bg-muted" />
            </div>
        );
    }

    if (!canAccess("retirement_page")) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                    <Crown className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Simulateur de retraite</h1>
                <p className="mt-2 text-muted-foreground max-w-md">
                    Planifiez votre retraite avec notre simulateur Monte Carlo avancé.
                    Cette fonctionnalité est disponible avec un abonnement Pro ou Élite.
                </p>
                <Link href="/billing">
                    <Button className="mt-6">Voir les plans</Button>
                </Link>
                <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} feature="Simulateur de retraite" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-primary" />
                    Simulateur de retraite
                </h1>
                <p className="text-muted-foreground">
                    Projection Monte Carlo avec {500} simulations
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Input Panel */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Paramètres</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Âge actuel: {params.currentAge} ans</Label>
                            <Slider
                                value={[params.currentAge]}
                                onValueChange={([v]: number[]) => updateParam("currentAge", v)}
                                min={18} max={70} step={1}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Âge de retraite: {params.retirementAge} ans</Label>
                            <Slider
                                value={[params.retirementAge]}
                                onValueChange={([v]: number[]) => updateParam("retirementAge", v)}
                                min={50} max={75} step={1}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Espérance de vie: {params.lifeExpectancy} ans</Label>
                            <Slider
                                value={[params.lifeExpectancy]}
                                onValueChange={([v]: number[]) => updateParam("lifeExpectancy", v)}
                                min={70} max={100} step={1}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="savings">Épargne actuelle ($)</Label>
                            <Input
                                id="savings"
                                type="number"
                                value={params.currentSavings}
                                onChange={(e) => updateParam("currentSavings", Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="monthly">Cotisation mensuelle ($)</Label>
                            <Input
                                id="monthly"
                                type="number"
                                value={params.monthlyContribution}
                                onChange={(e) => updateParam("monthlyContribution", Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expenses">Dépenses mensuelles à la retraite ($)</Label>
                            <Input
                                id="expenses"
                                type="number"
                                value={params.monthlyExpenses}
                                onChange={(e) => updateParam("monthlyExpenses", Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rendement espéré: {params.expectedReturn}%</Label>
                            <Slider
                                value={[params.expectedReturn]}
                                onValueChange={([v]: number[]) => updateParam("expectedReturn", v)}
                                min={1} max={15} step={0.5}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Inflation: {params.inflationRate}%</Label>
                            <Slider
                                value={[params.inflationRate]}
                                onValueChange={([v]: number[]) => updateParam("inflationRate", v)}
                                min={0} max={6} step={0.5}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Volatilité du portefeuille: {params.portfolioVolatility}%</Label>
                            <Slider
                                value={[params.portfolioVolatility]}
                                onValueChange={([v]: number[]) => updateParam("portfolioVolatility", v)}
                                min={1} max={30} step={0.5}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rrq">Pension gouvernementale annuelle ($)</Label>
                            <Input
                                id="rrq"
                                type="number"
                                value={params.governmentPension}
                                onChange={(e) => updateParam("governmentPension", Number(e.target.value))}
                            />
                            {pensionEstimate && !pensionOverridden && (
                                <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                        <Sparkles className="h-3 w-3" />
                                        Estimation automatique
                                    </div>
                                    <div className="space-y-0.5 text-xs text-muted-foreground">
                                        <div className="flex justify-between">
                                            <span>RRQ/RPC estimé</span>
                                            <span className="font-medium">{Math.round(pensionEstimate.rrq / 12).toLocaleString("fr-CA")}$/mois</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>PSV/OAS estimée</span>
                                            <span className="font-medium">{Math.round(pensionEstimate.psv / 12).toLocaleString("fr-CA")}$/mois</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/70">Basé sur votre revenu et votre âge. Vous pouvez ajuster manuellement.</p>
                                </div>
                            )}
                            {pensionOverridden && pensionEstimate && (
                                <button
                                    className="text-xs text-primary/70 hover:text-primary underline"
                                    onClick={() => {
                                        setPensionOverridden(false);
                                        setParams((prev) => ({ ...prev, governmentPension: Math.round(pensionEstimate.total) }));
                                    }}
                                >
                                    Restaurer l&apos;estimation automatique
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Taux d&apos;imposition à la retraite: {params.withdrawalTaxRate}%</Label>
                            <Slider
                                value={[params.withdrawalTaxRate]}
                                onValueChange={([v]: number[]) => updateParam("withdrawalTaxRate", v)}
                                min={0} max={50} step={1}
                            />
                            <p className="text-xs text-muted-foreground">
                                Taux marginal effectif sur retraits REER/FERR et pension gouvernementale
                            </p>
                        </div>

                        <Button onClick={() => setSimKey((k) => k + 1)} className="w-full gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Relancer la simulation
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Capital à la retraite (médian)</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(finalMedian)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Nombre FIRE (règle 4%)</p>
                                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(fireNumber)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Revenu brut mensuel</p>
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(grossMonthlyIncome)}/mois</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    dont {formatCurrency(params.governmentPension / 12)}/mois de pension
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Revenu net mensuel (après impôt)</p>
                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(afterTaxMonthlyIncome)}/mois</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    impôt estimé: {formatCurrency(monthlyTax)}/mois ({params.withdrawalTaxRate}%)
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Simple mode plain-language summary */}
                    {isSimple && !showAdvanced && (
                        <Card className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20">
                            <CardContent className="p-5 space-y-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">En clair</p>
                                <p className="text-sm leading-relaxed">
                                    Si vous épargnez <strong>{formatCurrency(params.monthlyContribution)}/mois</strong> jusqu'à <strong>{params.retirementAge} ans</strong>,{" "}
                                    votre capital estimé sera d'environ <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(finalMedian)}</strong>.{" "}
                                    Cela vous donnera un revenu mensuel d'environ <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(afterTaxMonthlyIncome)}/mois</strong>{" "}
                                    (après impôt), incluant vos pensions gouvernementales.
                                </p>
                                {afterTaxMonthlyIncome >= params.monthlyExpenses ? (
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Votre revenu couvre vos dépenses prévues de {formatCurrency(params.monthlyExpenses)}/mois.
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                                        Il manque environ {formatCurrency(params.monthlyExpenses - afterTaxMonthlyIncome)}/mois. Augmentez vos cotisations ou réduisez vos dépenses cibles.
                                    </div>
                                )}
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAdvanced(true)}>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    Voir l&apos;analyse avancée (Monte Carlo)
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Monte Carlo Chart + Info — hidden in simple mode unless expanded */}
                    {(!isSimple || showAdvanced) && (<>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <TrendingUp className="h-5 w-5" />
                                        Projection Monte Carlo
                                    </CardTitle>
                                    <CardDescription>
                                        Intervalles de confiance 10e–90e percentile (ajusté pour l&apos;inflation)
                                    </CardDescription>
                                </div>
                                {isSimple && showAdvanced && (
                                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAdvanced(false)}>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        Réduire
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] md:h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={results}>
                                        <defs>
                                            <linearGradient id="gradP90" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="gradP50" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="gradP10" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                        <XAxis
                                            dataKey="age"
                                            tick={{ fill: "#9ca3af", fontSize: 12 }}
                                            tickFormatter={(v) => `${v} ans`}
                                            stroke="#4b5563"
                                        />
                                        <YAxis
                                            tick={{ fill: "#9ca3af", fontSize: 12 }}
                                            tickFormatter={(v) => formatCurrency(v)}
                                            stroke="#4b5563"
                                        />
                                        <RechartsTooltip
                                            formatter={(value) => formatCurrency(Number(value))}
                                            labelFormatter={(label) => `${label} ans`}
                                            contentStyle={{
                                                backgroundColor: "rgba(17, 24, 39, 0.95)",
                                                border: "1px solid #374151",
                                                borderRadius: "8px",
                                                color: "#f3f4f6",
                                            }}
                                            labelStyle={{ color: "#9ca3af" }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p90"
                                            stroke="#34d399"
                                            strokeWidth={1.5}
                                            strokeDasharray="6 3"
                                            fill="url(#gradP90)"
                                            name="90e percentile"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p75"
                                            stroke="#6ee7b7"
                                            strokeWidth={1}
                                            fill="transparent"
                                            name="75e percentile"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p50"
                                            stroke="#22d3ee"
                                            strokeWidth={3}
                                            fill="url(#gradP50)"
                                            name="Médian"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p25"
                                            stroke="#fbbf24"
                                            strokeWidth={1}
                                            fill="transparent"
                                            name="25e percentile"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p10"
                                            stroke="#f87171"
                                            strokeWidth={1.5}
                                            strokeDasharray="6 3"
                                            fill="url(#gradP10)"
                                            name="10e percentile"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex gap-3 items-start">
                                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>
                                        <strong>Méthodologie :</strong> Simulation Monte Carlo avec 500 trajectoires.
                                        Rendements modélisés par une distribution log-normale (σ = {params.portfolioVolatility}%).
                                        Tous les montants sont ajustés pour l&apos;inflation.
                                    </p>
                                    <p>
                                        <strong>Revenu net :</strong> Capital médian ÷ années en retraite + pension gouvernementale, moins l&apos;impôt estimé au taux de {params.withdrawalTaxRate}%.
                                        La <Badge variant="outline" className="text-xs px-1 py-0">règle 4%</Badge> calcule le nombre FIRE = dépenses annuelles × 25 (capital nécessaire pour retirer 4%/an indéfiniment).
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    </>)}
                </div>
            </div>
            <FloatingHelpButton question="Explique-moi ma situation de retraite en termes simples" />
        </div>
    );
}
