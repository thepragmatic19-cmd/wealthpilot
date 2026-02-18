"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AllocationChart } from "@/components/portfolio/allocation-chart";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { MarketTicker } from "@/components/dashboard/market-ticker";
import { computeWeightedMer } from "@/lib/portfolio/helpers";
import { formatCurrency, RISK_PROFILES, GOAL_ICONS } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FINANCIAL_TERMS } from "@/lib/financial-terms";
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  Target,
  MessageSquare,
  Shield,
  ArrowRight,
  Lightbulb,
  ClipboardList,
  Sparkles,
  Info,
  Calculator,
  Wallet,
  PiggyBank,
} from "lucide-react";
import type {
  Profile,
  ClientInfo,
  Goal,
  RiskAssessment,
  Portfolio,
  PortfolioAllocation,
  ChatMessage,
} from "@/types/database";

function MetricLabel({ label, className }: { label: string; className?: string }) {
  const tooltip = FINANCIAL_TERMS[label];
  if (!tooltip) return <p className={className || "text-sm font-medium"}>{label}</p>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className={`${className || "text-sm font-medium"} inline-flex items-center gap-1 cursor-help`}>
            {label}
            <Info className="h-3 w-3" />
          </p>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function QuickActionsCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/chat">
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm">Chat IA</span>
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-sm">Ajouter transaction</span>
            </Button>
          </Link>
          <Link href="/portfolio">
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <PieChart className="h-4 w-4 text-primary" />
              <span className="text-sm">Gérer le portefeuille</span>
            </Button>
          </Link>
          <Link href="/fiscal">
            <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm">Planification fiscale</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface Recommendation {
  text: string;
  href: string;
}

function generateRecommendations(data: DashboardData): Recommendation[] {
  const recs: Recommendation[] = [];
  const portfolio = data.selectedPortfolio;
  const clientInfo = data.clientInfo;

  // CELI/REER allocation recommendation
  if (clientInfo) {
    const celiBalance = Number(clientInfo.celi_balance || 0);
    const reerBalance = Number(clientInfo.reer_balance || 0);
    const total = celiBalance + reerBalance;
    if (total > 0) {
      const celiPct = Math.round((celiBalance / total) * 100);
      if (celiPct > 70) {
        recs.push({ text: `Votre répartition est ${celiPct}% CELI / ${100 - celiPct}% REER. Envisagez d'augmenter vos cotisations REER pour optimiser vos déductions fiscales.`, href: "/fiscal" });
      } else if (celiPct < 30) {
        recs.push({ text: `Votre répartition est ${celiPct}% CELI / ${100 - celiPct}% REER. Maximiser votre CELI permet de faire croître vos placements à l'abri de l'impôt.`, href: "/fiscal" });
      } else {
        recs.push({ text: `Bonne répartition CELI/REER (${celiPct}%/${100 - celiPct}%). Continuez à cotiser régulièrement aux deux comptes.`, href: "/fiscal" });
      }
    } else {
      recs.push({ text: "Ouvrez un CELI et un REER pour profiter des avantages fiscaux canadiens sur vos placements.", href: "/fiscal" });
    }
  }

  // Goal progress recommendation
  if (data.goals.length > 0) {
    const closest = data.goals.reduce((best, goal) => {
      const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;
      const bestProgress = best.target_amount > 0 ? best.current_amount / best.target_amount : 0;
      return progress > bestProgress ? goal : best;
    });
    const progress = Math.round(
      closest.target_amount > 0 ? (closest.current_amount / closest.target_amount) * 100 : 0
    );
    if (progress >= 80) {
      recs.push({ text: `Vous êtes à ${progress}% de votre objectif « ${closest.label} ». Planifiez la transition vers des placements plus conservateurs à l'approche de la cible.`, href: "/portfolio" });
    } else if (progress >= 50) {
      recs.push({ text: `Votre objectif « ${closest.label} » est à ${progress}%. Maintenez le cap avec des cotisations régulières pour rester en bonne voie.`, href: "/chat" });
    } else {
      recs.push({ text: `Votre objectif « ${closest.label} » est à ${progress}%. Envisagez d'augmenter vos cotisations mensuelles pour accélérer votre progression.`, href: "/chat" });
    }
  }

  // Portfolio volatility recommendation
  if (portfolio) {
    const vol = portfolio.volatility || 0;
    if (vol > 15) {
      recs.push({ text: `Votre portefeuille a une volatilité de ${vol}%. Pour réduire le risque, envisagez d'ajouter des obligations à court terme (ex: XSB.TO).`, href: "/portfolio" });
    } else if (vol > 10) {
      recs.push({ text: `Volatilité modérée de ${vol}%. Votre diversification est adéquate pour un horizon de placement à moyen-long terme.`, href: "/portfolio" });
    } else {
      recs.push({ text: `Volatilité faible de ${vol}%. Si votre horizon est long, vous pourriez augmenter votre exposition aux actions pour améliorer le rendement.`, href: "/portfolio" });
    }
  }

  // Fallback if no data-driven recs
  if (recs.length === 0) {
    recs.push({ text: "Complétez votre profil financier pour recevoir des recommandations personnalisées.", href: "/onboarding" });
  }

  return recs;
}

interface DashboardData {
  profile: Profile | null;
  clientInfo: ClientInfo | null;
  goals: Goal[];
  riskAssessment: RiskAssessment | null;
  selectedPortfolio: (Portfolio & { allocations: PortfolioAllocation[] }) | null;
  chatMessages: ChatMessage[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    profile: null,
    clientInfo: null,
    goals: [],
    riskAssessment: null,
    selectedPortfolio: null,
    chatMessages: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [
          { data: profile },
          { data: clientInfo },
          { data: goals },
          { data: riskAssessment },
          { data: portfolio },
          { data: chatMsgs },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("client_info").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("goals").select("*").eq("user_id", user.id).order("priority"),
          supabase
            .from("risk_assessments")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("portfolios")
            .select("*, portfolio_allocations(*)")
            .eq("user_id", user.id)
            .eq("is_selected", true)
            .maybeSingle(),
          supabase
            .from("chat_messages")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(20),
        ]);

        setData({
          profile: profile as Profile | null,
          clientInfo: clientInfo as ClientInfo | null,
          goals: (goals as Goal[]) || [],
          riskAssessment: riskAssessment as RiskAssessment | null,
          selectedPortfolio: portfolio
            ? {
              ...portfolio,
              allocations: portfolio.portfolio_allocations || [],
            } as Portfolio & { allocations: PortfolioAllocation[] }
            : null,
          chatMessages: (chatMsgs as ChatMessage[]) || [],
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-lg font-semibold text-destructive">Erreur de chargement</p>
        <p className="text-muted-foreground">Impossible de charger vos données. Veuillez rafraîchir la page.</p>
        <Button onClick={() => window.location.reload()}>Rafraîchir</Button>
      </div>
    );
  }

  // Not onboarded
  if (!data.profile?.onboarding_completed) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <ClipboardList className="h-20 w-20 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Bienvenue sur WealthPilot!</h2>
        <p className="max-w-md text-center text-muted-foreground">
          Complétez votre profil pour recevoir des recommandations personnalisées.
        </p>
        <Link href="/onboarding">
          <Button size="lg" className="gap-2">
            Commencer l&apos;évaluation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const riskProfile = data.riskAssessment?.risk_profile
    ? RISK_PROFILES[data.riskAssessment.risk_profile]
    : null;

  const totalInvested = Number(data.clientInfo?.total_assets || 0);
  const celiBalance = Number(data.clientInfo?.celi_balance || 0);
  const reerBalance = Number(data.clientInfo?.reer_balance || 0);
  const reeeBalance = Number(data.clientInfo?.reee_balance || 0);
  const totalRegistered = celiBalance + reerBalance + reeeBalance;
  const monthlySavings = Number(data.clientInfo?.monthly_savings || 0);
  const annualIncome = Number(data.clientInfo?.annual_income || 0);
  const savingsRate = annualIncome > 0 ? Math.round((monthlySavings * 12 / annualIncome) * 100) : 0;
  const expectedReturn = data.selectedPortfolio?.expected_return || 0;
  const projectedValue = totalInvested > 0
    ? Math.round(totalInvested * (1 + expectedReturn / 100) + monthlySavings * 12)
    : 0;

  // Monthly savings trend: estimated monthly variation vs previous month
  const trendPct = totalInvested > monthlySavings && monthlySavings > 0
    ? Math.round((monthlySavings / (totalInvested - monthlySavings)) * 1000) / 10
    : null;

  // Weighted MER for display in portfolio metrics
  const merDisplay = data.selectedPortfolio
    ? data.selectedPortfolio.total_mer != null
      ? data.selectedPortfolio.total_mer.toFixed(2)
      : computeWeightedMer(data.selectedPortfolio.allocations)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Bonjour, {data.profile?.full_name?.split(" ")[0] || "investisseur"} 👋
        </h1>
        <p className="text-muted-foreground">Voici un résumé de votre situation.</p>
      </div>

      {/* Market Ticker */}
      <MarketTicker />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* C.1 — Net Worth with account breakdown + trend arrow */}
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Actifs Totaux</p>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
              {trendPct !== null && (
                <div className={`flex items-center gap-1 text-xs mt-0.5 ${trendPct >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {trendPct >= 0
                    ? <TrendingUp className="h-3 w-3" />
                    : <TrendingDown className="h-3 w-3" />
                  }
                  {trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}%
                  <span className="text-muted-foreground ml-1">ce mois</span>
                </div>
              )}
              {totalRegistered > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {celiBalance > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-200 bg-green-50/50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      CELI {totalRegistered > 0 ? Math.round(celiBalance / totalRegistered * 100) : 0}%
                    </Badge>
                  )}
                  {reerBalance > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 bg-blue-50/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      REER {totalRegistered > 0 ? Math.round(reerBalance / totalRegistered * 100) : 0}%
                    </Badge>
                  )}
                  {reeeBalance > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-200 bg-purple-50/50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                      REEE {totalRegistered > 0 ? Math.round(reeeBalance / totalRegistered * 100) : 0}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* C.2 — Projection 1 an */}
        <Card className="border-none bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Projection 1 an</p>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {projectedValue > 0 ? formatCurrency(projectedValue) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {expectedReturn > 0 ? `+${expectedReturn}% rendement + épargne` : "Sélectionnez un portefeuille"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Score de Risque */}
        <Card className="border-none bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Score de Risque</p>
              <Shield className="h-4 w-4 text-orange-600" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {data.riskAssessment?.risk_score || "—"}/10
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="h-4 text-[10px] px-1 border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                >
                  {riskProfile?.label || "—"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* C.4 — Épargne mensuelle KPI */}
        <Card className="border-none bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Épargne mensuelle</p>
              <PiggyBank className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {monthlySavings > 0 ? formatCurrency(monthlySavings) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {savingsRate > 0 ? (
                  <>
                    {savingsRate}% du revenu
                    {savingsRate >= 20 ? (
                      <span className="text-green-600"> — Excellent</span>
                    ) : savingsRate >= 10 ? (
                      <span className="text-yellow-600"> — Objectif: 20%</span>
                    ) : (
                      <span className="text-red-500"> — Objectif: 20%</span>
                    )}
                  </>
                ) : "Renseignez votre épargne"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions — always visible after KPI cards */}
      <QuickActionsCard />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Portfolio allocation + metrics row */}
        {data.selectedPortfolio && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Répartition {data.selectedPortfolio.name}
                </CardTitle>
                <CardDescription>{data.selectedPortfolio.description}</CardDescription>
              </div>
              <Link href="/portfolio">
                <Button variant="outline" size="sm" className="gap-1">
                  Gérer <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <AllocationChart allocations={data.selectedPortfolio.allocations} />

              {/* Portfolio metrics: expected return, volatility, Sharpe, MER */}
              <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="text-center">
                  <MetricLabel label="Rendement attendu" className="text-xs text-muted-foreground" />
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {data.selectedPortfolio.expected_return}%
                  </p>
                </div>
                <div className="text-center">
                  <MetricLabel label="Volatilité" className="text-xs text-muted-foreground" />
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {data.selectedPortfolio.volatility}%
                  </p>
                </div>
                <div className="text-center">
                  <MetricLabel label="Ratio de Sharpe" className="text-xs text-muted-foreground" />
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {data.selectedPortfolio.sharpe_ratio ?? "—"}
                  </p>
                </div>
                <div className="text-center">
                  <MetricLabel label="RFG moyen" className="text-xs text-muted-foreground" />
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {merDisplay != null ? `${merDisplay}%` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals with days-remaining badges */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Objectifs de vie
            </CardTitle>
            <CardDescription>Suivi de votre progression</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            {data.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun objectif défini.</p>
            ) : (
              data.goals.map((goal) => {
                const progress = goal.target_amount > 0
                  ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
                  : 0;

                let daysRemaining: number | null = null;
                if (goal.target_date) {
                  daysRemaining = Math.floor(
                    (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                }

                return (
                  <div key={goal.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-lg">
                          {GOAL_ICONS[goal.type] || "🎯"}
                        </span>
                        {goal.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {daysRemaining !== null && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              daysRemaining < 0
                                ? "border-red-200 bg-red-50/50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                : daysRemaining < 365
                                  ? "border-orange-200 bg-orange-50/50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                                  : "border-green-200 bg-green-50/50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            }`}
                          >
                            {daysRemaining < 0
                              ? "Dépassé"
                              : daysRemaining < 365
                                ? `Dans ${daysRemaining} j`
                                : `Dans ${Math.round(daysRemaining / 365 * 10) / 10} ans`}
                          </Badge>
                        )}
                        <span className="text-xs font-bold text-primary">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatCurrency(goal.current_amount)}</span>
                        <span>Cible: {formatCurrency(goal.target_amount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insights Row — 3-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Col 1: Stress Test (if portfolio) or Quick Actions fallback */}
        {data.selectedPortfolio?.stress_test ? (
          <Card className="border-yellow-200/50 bg-yellow-50/10 dark:bg-yellow-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
                <Shield className="h-5 w-5" />
                Résilience en temps de crise
              </CardTitle>
              <CardDescription>Comment votre portefeuille réagit aux chocs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-md bg-white dark:bg-black/20 p-2 text-center border border-yellow-100 dark:border-yellow-900/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Inflation</p>
                    <p className="text-xs font-bold">{data.selectedPortfolio.stress_test.inflation_shock}</p>
                  </div>
                  <div className="rounded-md bg-white dark:bg-black/20 p-2 text-center border border-yellow-100 dark:border-yellow-900/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Krach (-30%)</p>
                    <p className="text-xs font-bold text-red-500">{data.selectedPortfolio.stress_test.market_crash}</p>
                  </div>
                  <div className="rounded-md bg-white dark:bg-black/20 p-2 text-center border border-yellow-100 dark:border-yellow-900/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Taux</p>
                    <p className="text-xs font-bold">{data.selectedPortfolio.stress_test.interest_rate_hike}</p>
                  </div>
                </div>
                {data.selectedPortfolio.tax_strategy && (
                  <div className="flex gap-3 items-start p-3 rounded-lg bg-blue-500/5 border border-blue-200/20">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      &quot;{data.selectedPortfolio.tax_strategy}&quot;
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <QuickActionsCard />
        )}

        {/* Col 2: AI Insights Panel */}
        <AiInsightsPanel />

        {/* Col 3: AI Recommendations */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Pilotage IA
            </CardTitle>
            <CardDescription>Actions recommandées pour optimiser votre capital</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {generateRecommendations(data).map((rec, i) => (
              <Link key={i} href={rec.href}>
                <div className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-3 hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium">{rec.text}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Row 2: Activity Timeline — full width */}
        <div className="lg:col-span-3">
          <ActivityTimeline
            goals={data.goals}
            chatMessages={data.chatMessages}
            portfolios={data.selectedPortfolio ? [data.selectedPortfolio] : []}
            profileUpdated={data.profile?.updated_at}
          />
        </div>
      </div>
    </div>
  );
}
