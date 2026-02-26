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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
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


export default function RetirementPage() {
    const [params, setParams] = useState(DEFAULT_PARAMS);
    const [simKey, setSimKey] = useState(0);
    const { canAccess, isLoading: subLoading } = useSubscription();
    const [showUpgrade, setShowUpgrade] = useState(false);

    const updateParam = useCallback((key: keyof typeof DEFAULT_PARAMS, value: number) => {
        setParams((prev) => ({ ...prev, [key]: value }));
    }, []);

    useEffect(() => {
        async function loadPortfolioVolatility() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: portfolio } = await supabase
                .from("portfolios")
                .select("volatility")
                .eq("user_id", user.id)
                .eq("is_selected", true)
                .maybeSingle();
            if (portfolio?.volatility) {
                updateParam("portfolioVolatility", portfolio.volatility);
            }
        }
        loadPortfolioVolatility();
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

                    {/* Monte Carlo Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="h-5 w-5" />
                                Projection Monte Carlo
                            </CardTitle>
                            <CardDescription>
                                Intervalles de confiance 10e–90e percentile (ajusté pour l&apos;inflation)
                            </CardDescription>
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
                </div>
            </div>
        </div>
    );
}
