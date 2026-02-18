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
} from "lucide-react";
import type { ClientInfo, Portfolio, PortfolioAllocation } from "@/types/database";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// 2024 limits for Canada
const CELI_ANNUAL_LIMIT = 7000;
const CELI_CUMULATIVE_LIMIT = 95000; // since 2009 for someone 18+ since 2009
const REER_RATE = 0.18; // 18% of earned income
const REER_MAX = 31560; // 2024 max

interface FiscalData {
    clientInfo: ClientInfo | null;
    portfolio: (Portfolio & { portfolio_allocations: PortfolioAllocation[] }) | null;
}

export default function FiscalPage() {
    const [data, setData] = useState<FiscalData>({ clientInfo: null, portfolio: null });
    const [loading, setLoading] = useState(true);
    const { canAccess, isLoading: subLoading } = useSubscription();
    const [showUpgrade, setShowUpgrade] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [{ data: ci }, { data: portfolio }] = await Promise.all([
                    supabase.from("client_info").select("*").eq("user_id", user.id).maybeSingle(),
                    supabase
                        .from("portfolios")
                        .select("*, portfolio_allocations(*)")
                        .eq("user_id", user.id)
                        .eq("is_selected", true)
                        .maybeSingle(),
                ]);

                setData({
                    clientInfo: ci as ClientInfo | null,
                    portfolio: portfolio as FiscalData["portfolio"],
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

    const { clientInfo, portfolio } = data;
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
    const estimatedTaxBracket = annualIncome > 235675 ? 0.33 : annualIncome > 165430 ? 0.29 : annualIncome > 111733 ? 0.26 : annualIncome > 55867 ? 0.205 : 0.15;
    const estimatedTaxSavings = reerRoom * estimatedTaxBracket;

    // Rebalancing suggestions (compare target vs current allocations)
    const allocations = portfolio?.portfolio_allocations || [];
    const totalWeight = allocations.reduce((s, a) => s + Number(a.weight), 0);
    const rebalancingSuggestions = allocations
        .map((a) => {
            const targetWeight = Number(a.weight);
            const currentWeight = totalWeight > 0 ? targetWeight : 0; // Static data, so current = target
            const drift = Math.abs(currentWeight - targetWeight);
            return {
                name: a.instrument_name,
                ticker: a.instrument_ticker,
                assetClass: a.asset_class,
                targetWeight,
                currentWeight,
                drift,
                action: currentWeight < targetWeight ? "Acheter" : currentWeight > targetWeight ? "Vendre" : "OK",
            };
        })
        .sort((a, b) => b.drift - a.drift);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Planification fiscale</h1>
                <p className="text-sm text-muted-foreground">
                    Optimisez vos cotisations et maximisez vos avantages fiscaux
                </p>
            </div>

            {/* Account Overview */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                Limite annuelle {CELI_ANNUAL_LIMIT.toLocaleString("fr-CA")}$ (2024)
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
                                18% du revenu, max {REER_MAX.toLocaleString("fr-CA")}$ (2024)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* REEE Card */}
                <Card className="border-purple-200 dark:border-purple-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <PiggyBank className="h-5 w-5 text-purple-500" />
                            REEE
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Solde actuel</span>
                                <span className="font-semibold">${reeeBalance.toLocaleString("fr-CA")}</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium">Subvention SCEE</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Le gouvernement peut contribuer jusqu&apos;à 20% de vos cotisations (max 500$/an par enfant)
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tax Optimization & Rebalancing */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm text-muted-foreground">Si vous cotisez le maximum REER restant</p>
                                    <p className="text-3xl font-bold mt-1">
                                        ${estimatedTaxSavings.toLocaleString("fr-CA", { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Taux marginal estimé: {(estimatedTaxBracket * 100).toFixed(1)}% (fédéral)
                                    </p>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Revenu annuel</span>
                                        <span>${annualIncome.toLocaleString("fr-CA")}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Cotisation max REER</span>
                                        <span>${reerRoom.toLocaleString("fr-CA")}</span>
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
                                {rebalancingSuggestions.slice(0, 8).map((item) => (
                                    <div
                                        key={item.ticker}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <Badge variant="outline" className="text-[10px]">{item.ticker}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{item.assetClass}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{item.targetWeight}%</p>
                                            <Badge variant={item.action === "OK" ? "secondary" : "outline"} className="text-[10px]">
                                                {item.action === "OK" ? "✓ Aligné" : item.action}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                <div className="rounded-lg bg-muted/50 p-3 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        💡 Les données de rééquilibrage seront dynamiques une fois le suivi en temps réel activé
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
