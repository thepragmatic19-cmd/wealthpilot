"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Calculator,
    PiggyBank,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Info,
    ArrowUp,
    ArrowDown,
    Sliders,
} from "lucide-react";
import type { ClientInfo, Portfolio, PortfolioAllocation, Transaction } from "@/types/database";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const PROVINCES: Record<string, { label: string; brackets: Array<{ max: number; rate: number }> }> = {
    QC: { label: "Québec", brackets: [{ max: 51780, rate: 0.14 }, { max: 103545, rate: 0.19 }, { max: 126000, rate: 0.24 }, { max: Infinity, rate: 0.2575 }] },
    ON: { label: "Ontario", brackets: [{ max: 51446, rate: 0.0505 }, { max: 102894, rate: 0.0915 }, { max: 150000, rate: 0.1116 }, { max: 220000, rate: 0.1216 }, { max: Infinity, rate: 0.1316 }] },
    BC: { label: "Colombie-Britannique", brackets: [{ max: 45654, rate: 0.0506 }, { max: 91310, rate: 0.077 }, { max: 104835, rate: 0.105 }, { max: 127299, rate: 0.1229 }, { max: 172602, rate: 0.147 }, { max: 240716, rate: 0.168 }, { max: Infinity, rate: 0.205 }] },
    AB: { label: "Alberta", brackets: [{ max: 148269, rate: 0.10 }, { max: 177922, rate: 0.12 }, { max: 237230, rate: 0.13 }, { max: 355845, rate: 0.14 }, { max: Infinity, rate: 0.15 }] },
};

function getProvincialRate(income: number, province: string): number {
    const prov = PROVINCES[province];
    if (!prov) return 0;
    for (const b of prov.brackets) {
        if (income <= b.max) return b.rate;
    }
    return prov.brackets[prov.brackets.length - 1].rate;
}

// 2026 limits for Canada
const CELI_ANNUAL_LIMIT = 7000;
const CELI_CUMULATIVE_LIMIT = 109000; // cumulative since 2009 through 2026 ($102k through 2025 + $7k for 2026)
const REER_RATE = 0.18; // 18% of earned income
const REER_MAX = 32490; // 2025 max (indexed to inflation)
// REEE/SCEE constants
const SCEE_RATE = 0.20; // 20% basic SCEE
const SCEE_MAX_ANNUAL = 500; // max grant per child per year
const SCEE_OPTIMAL_CONTRIBUTION = SCEE_MAX_ANNUAL / SCEE_RATE; // $2,500
const SCEE_LIFETIME_MAX = 7200; // lifetime max per child

interface FiscalData {
    clientInfo: ClientInfo | null;
    portfolio: (Portfolio & { portfolio_allocations: PortfolioAllocation[] }) | null;
    transactions: Transaction[];
}

export default function FiscalPage() {
    const [data, setData] = useState<FiscalData>({ clientInfo: null, portfolio: null, transactions: [] });
    const [loading, setLoading] = useState(true);
    const [province, setProvince] = useState("QC");
    const [contributionAmount, setContributionAmount] = useState(5000);
    const { canAccess, isLoading: subLoading } = useSubscription();
    const [showUpgrade, setShowUpgrade] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [{ data: ci }, { data: portfolio }, { data: txData }] = await Promise.all([
                    supabase.from("client_info").select("*").eq("user_id", user.id).maybeSingle(),
                    supabase
                        .from("portfolios")
                        .select("*, portfolio_allocations(*)")
                        .eq("user_id", user.id)
                        .eq("is_selected", true)
                        .maybeSingle(),
                    supabase
                        .from("transactions")
                        .select("*")
                        .eq("user_id", user.id),
                ]);

                setData({
                    clientInfo: ci as ClientInfo | null,
                    portfolio: portfolio as FiscalData["portfolio"],
                    transactions: (txData as Transaction[]) || [],
                });
            } catch (err) {
                console.error("Error loading fiscal data:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading || subLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            </div>
        );
    }

    if (!canAccess("fiscal_page")) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                    <Crown className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Planification fiscale</h1>
                <p className="mt-2 text-muted-foreground max-w-md">
                    Optimisez vos cotisations CELI, REER et REEE avec notre planification fiscale avancée.
                    Cette fonctionnalité est disponible avec un abonnement Pro ou Élite.
                </p>
                <Link href="/billing">
                    <Button className="mt-6">Voir les plans</Button>
                </Link>
                <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} feature="Planification fiscale" />
            </div>
        );
    }

    const { clientInfo, portfolio, transactions } = data;
    const annualIncome = Number(clientInfo?.annual_income) || 0;
    const celiBalance = Number(clientInfo?.celi_balance) || 0;
    const reerBalance = Number(clientInfo?.reer_balance) || 0;
    const reeeBalance = Number(clientInfo?.reee_balance) || 0;

    // REER computation
    const reerLimit = Math.min(annualIncome * REER_RATE, REER_MAX);
    const reerRoom = Math.max(0, reerLimit - reerBalance);
    const reerUsagePercent = reerLimit > 0 ? Math.min(100, (reerBalance / reerLimit) * 100) : 0;

    // CELI computation
    const celiRoom = Math.max(0, CELI_CUMULATIVE_LIMIT - celiBalance);
    const celiUsagePercent = Math.min(100, (celiBalance / CELI_CUMULATIVE_LIMIT) * 100);

    // Estimated tax savings from REER contributions
    // Federal marginal rate
    const federalRate = annualIncome > 235675 ? 0.33 : annualIncome > 165430 ? 0.29 : annualIncome > 111733 ? 0.26 : annualIncome > 55867 ? 0.205 : 0.15;
    // Provincial marginal rate
    const provincialRate = getProvincialRate(annualIncome, province);
    // Combined rate
    const combinedRate = federalRate + provincialRate;
    const estimatedTaxSavings = reerRoom * combinedRate;

    // REEE SCEE projection
    const sceeAccumulated = reeeBalance * SCEE_RATE; // rough estimate of grants received
    const sceeRemainingLifetime = Math.max(0, SCEE_LIFETIME_MAX - sceeAccumulated);

    // Compute actual holdings from transactions
    const holdingsMap: Record<string, { name: string; value: number }> = {};
    for (const tx of transactions) {
        const ticker = tx.instrument_ticker;
        if (!holdingsMap[ticker]) {
            holdingsMap[ticker] = { name: tx.instrument_name, value: 0 };
        }
        if (tx.type === "achat" || tx.type === "cotisation") {
            holdingsMap[ticker].value += tx.amount;
        } else if (tx.type === "vente") {
            holdingsMap[ticker].value -= tx.amount;
        }
    }
    // Remove zero/negative holdings
    Object.keys(holdingsMap).forEach((k) => {
        if (holdingsMap[k].value <= 0) delete holdingsMap[k];
    });
    const totalHoldingsValue = Object.values(holdingsMap).reduce((s, h) => s + h.value, 0);
    const hasTransactionData = totalHoldingsValue > 0;

    // Rebalancing suggestions
    const allocations = portfolio?.portfolio_allocations || [];
    const rebalancingSuggestions = allocations
        .map((a) => {
            const targetWeight = Number(a.weight);
            let currentWeight = 0;
            if (hasTransactionData && holdingsMap[a.instrument_ticker]) {
                currentWeight = (holdingsMap[a.instrument_ticker].value / totalHoldingsValue) * 100;
            } else {
                currentWeight = targetWeight; // No transaction data → assume on target
            }
            const drift = currentWeight - targetWeight;
            return {
                name: a.instrument_name,
                ticker: a.instrument_ticker,
                assetClass: a.asset_class,
                targetWeight,
                currentWeight: Math.round(currentWeight * 10) / 10,
                drift: Math.round(drift * 10) / 10,
                action: drift < -2 ? "Acheter" : drift > 2 ? "Vendre" : "OK",
            };
        })
        .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Planification fiscale</h1>
                <p className="text-sm text-muted-foreground">
                    Optimisez vos cotisations et maximisez vos avantages fiscaux
                </p>
            </div>

            {/* Account Overview */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* CELI Card */}
                <Card className="border-green-200 dark:border-green-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <PiggyBank className="h-5 w-5 text-green-500" />
                            CELI
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Solde actuel</span>
                                <span className="font-semibold">${celiBalance.toLocaleString("fr-CA")}</span>
                            </div>
                            <Progress value={celiUsagePercent} className="mt-2 h-2" />
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">{celiUsagePercent.toFixed(0)}% utilisé</span>
                                <span className="text-xs text-muted-foreground">/ ${CELI_CUMULATIVE_LIMIT.toLocaleString("fr-CA")}</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium">Droits de cotisation</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                                ${celiRoom.toLocaleString("fr-CA")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Limite annuelle {CELI_ANNUAL_LIMIT.toLocaleString("fr-CA")}$ (2026)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* REER Card */}
                <Card className="border-blue-200 dark:border-blue-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            REER
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Solde actuel</span>
                                <span className="font-semibold">${reerBalance.toLocaleString("fr-CA")}</span>
                            </div>
                            <Progress value={reerUsagePercent} className="mt-2 h-2" />
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">{reerUsagePercent.toFixed(0)}% de la limite</span>
                                <span className="text-xs text-muted-foreground">/ ${reerLimit.toLocaleString("fr-CA")}</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                            <div className="flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium">Espace REER restant</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                                ${reerRoom.toLocaleString("fr-CA")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                18% du revenu, max {REER_MAX.toLocaleString("fr-CA")}$ ({new Date().getFullYear()})
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* REEE Card — improved with SCEE calculator */}
                <Card className="border-purple-200 dark:border-purple-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <PiggyBank className="h-5 w-5 text-purple-500" />
                            REEE
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Solde actuel</span>
                            <span className="font-semibold">${reeeBalance.toLocaleString("fr-CA")}</span>
                        </div>
                        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium">Calculateur SCEE</span>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cotisation optimale/an</span>
                                    <span className="font-medium">{SCEE_OPTIMAL_CONTRIBUTION.toLocaleString("fr-CA")}$</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subvention max/an (20%)</span>
                                    <span className="font-medium text-purple-600 dark:text-purple-400">{SCEE_MAX_ANNUAL.toLocaleString("fr-CA")}$</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subvention max à vie</span>
                                    <span className="font-medium text-purple-600 dark:text-purple-400">{SCEE_LIFETIME_MAX.toLocaleString("fr-CA")}$</span>
                                </div>
                                {reeeBalance > 0 && (
                                    <div className="flex justify-between border-t pt-1.5">
                                        <span className="text-muted-foreground">Subventions restantes est.</span>
                                        <span className="font-semibold text-purple-600 dark:text-purple-400">~{sceeRemainingLifetime.toLocaleString("fr-CA")}$</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Contribution Optimizer */}
            {annualIncome > 0 && (
                <Card className="border-indigo-200 dark:border-indigo-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Sliders className="h-5 w-5 text-indigo-500" />
                            Optimiseur de contribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Slider */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm text-muted-foreground">Montant disponible pour investir</Label>
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    {contributionAmount.toLocaleString("fr-CA")} $
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={50000}
                                step={500}
                                value={contributionAmount}
                                onChange={(e) => setContributionAmount(Number(e.target.value))}
                                className="w-full accent-indigo-500"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0 $</span>
                                <span>50 000 $</span>
                            </div>
                        </div>

                        {/* Recommendation badge */}
                        {(() => {
                            const marginalRate = (federalRate + provincialRate) * 100;
                            const toReer = Math.min(contributionAmount, reerRoom);
                            const toCeli = Math.min(contributionAmount - toReer, celiRoom);
                            const reerTaxSaving = Math.round(toReer * (federalRate + provincialRate));
                            const celiGrowthEstimate = Math.round(toCeli * (Math.pow(1.07, 10) - 1));
                            let recLabel = "";
                            let recColor = "";
                            if (marginalRate >= 40) {
                                recLabel = "Prioriser le REER — économie fiscale maximale";
                                recColor = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
                            } else if (marginalRate < 30) {
                                recLabel = "Prioriser le CELI — croissance non imposée avantageuse";
                                recColor = "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
                            } else {
                                recLabel = "Split optimal : REER d'abord, puis CELI";
                                recColor = "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800";
                            }
                            return (
                                <>
                                    <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${recColor}`}>
                                        {recLabel}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* CELI column */}
                                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 space-y-1.5">
                                            <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">CELI</p>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Room disponible</span>
                                                <span className="font-medium">{celiRoom.toLocaleString("fr-CA")} $</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Montant suggéré</span>
                                                <span className="font-semibold text-green-700 dark:text-green-400">{toCeli.toLocaleString("fr-CA")} $</span>
                                            </div>
                                            <div className="flex justify-between text-xs border-t pt-1.5">
                                                <span className="text-muted-foreground">Croissance estimée × 10 ans</span>
                                                <span className="font-bold text-green-600">+{celiGrowthEstimate.toLocaleString("fr-CA")} $</span>
                                            </div>
                                        </div>
                                        {/* REER column */}
                                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-1.5">
                                            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">REER</p>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Room disponible</span>
                                                <span className="font-medium">{reerRoom.toLocaleString("fr-CA")} $</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Montant suggéré</span>
                                                <span className="font-semibold text-blue-700 dark:text-blue-400">{toReer.toLocaleString("fr-CA")} $</span>
                                            </div>
                                            <div className="flex justify-between text-xs border-t pt-1.5">
                                                <span className="text-muted-foreground">Économie fiscale immédiate</span>
                                                <span className="font-bold text-blue-600">-{reerTaxSaving.toLocaleString("fr-CA")} $</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            {/* Tax Optimization & Rebalancing */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Tax Savings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calculator className="h-5 w-5" />
                            Économies d&apos;impôt potentielles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {annualIncome > 0 ? (
                            <>
                                {/* Province selector */}
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground shrink-0">Province :</Label>
                                    <Select value={province} onValueChange={setProvince}>
                                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(PROVINCES).map(([k, v]) => (
                                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm text-muted-foreground">Économies si vous cotisez le maximum REER</p>
                                    <p className="text-2xl sm:text-3xl font-bold mt-1">
                                        ${estimatedTaxSavings.toLocaleString("fr-CA", { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Taux combiné : {(combinedRate * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Revenu annuel</span>
                                        <span>${annualIncome.toLocaleString("fr-CA")}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Taux fédéral marginal</span>
                                        <span>{(federalRate * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Taux provincial ({province})</span>
                                        <span>{(provincialRate * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t pt-2">
                                        <span className="text-muted-foreground">Taux combiné</span>
                                        <span>{(combinedRate * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between font-medium text-green-600 dark:text-green-400">
                                        <span>Réduction d&apos;impôt estimée</span>
                                        <span>${estimatedTaxSavings.toLocaleString("fr-CA", { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center py-8 text-center">
                                <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Renseignez votre revenu annuel dans votre profil pour voir les estimations
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Rebalancing Suggestions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-5 w-5" />
                            Rééquilibrage du portefeuille
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rebalancingSuggestions.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-center">
                                <CheckCircle className="h-8 w-8 text-green-500/30 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Sélectionnez un portefeuille pour voir les suggestions de rééquilibrage
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {!hasTransactionData && (
                                    <div className="rounded-lg bg-muted/50 p-2.5 mb-2">
                                        <p className="text-xs text-muted-foreground">
                                            <Info className="inline h-3 w-3 mr-1" />
                                            Ajoutez vos transactions pour calculer la dérive réelle de votre portefeuille.
                                        </p>
                                    </div>
                                )}
                                <div className="grid grid-cols-3 text-xs text-muted-foreground px-1 mb-1">
                                    <span>Instrument</span>
                                    <span className="text-center">Actuel / Cible</span>
                                    <span className="text-right">Dérive</span>
                                </div>
                                {rebalancingSuggestions.slice(0, 8).map((item) => (
                                    <div
                                        key={item.ticker}
                                        className="flex items-center justify-between rounded-lg border p-2.5"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-medium truncate">{item.name}</p>
                                                <Badge variant="outline" className="text-[10px] shrink-0">{item.ticker}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{item.assetClass}</p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2 shrink-0">
                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                {hasTransactionData ? `${item.currentWeight}%` : "—"} / {item.targetWeight}%
                                            </span>
                                            {hasTransactionData ? (
                                                <Badge
                                                    variant={item.action === "OK" ? "secondary" : "outline"}
                                                    className={`text-[10px] gap-0.5 ${item.action === "Acheter" ? "text-green-600 border-green-200" : item.action === "Vendre" ? "text-red-500 border-red-200" : ""}`}
                                                >
                                                    {item.action === "Acheter" && <ArrowUp className="h-2.5 w-2.5" />}
                                                    {item.action === "Vendre" && <ArrowDown className="h-2.5 w-2.5" />}
                                                    {item.action === "OK" ? "✓" : `${item.drift > 0 ? "+" : ""}${item.drift}%`}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px]">✓ Cible</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
