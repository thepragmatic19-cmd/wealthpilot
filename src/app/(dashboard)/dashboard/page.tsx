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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
        { href: "/chat", icon: MessageSquare, label: "Chat IA", color: "text-blue-500", bg: "bg-blue-500/10" },
        { href: "/transactions", icon: Calculator, label: "Transaction", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { href: "/portfolio", icon: PieChart, label: "Portefeuille", color: "text-orange-500", bg: "bg-orange-500/10" },
        { href: "/fiscal", icon: Shield, label: "Planification", color: "text-purple-500", bg: "bg-purple-500/10" },
      ].map((action, i) => (
        <Link key={i} href={action.href}>
          <div className="group flex items-center gap-4 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card transition-all cursor-pointer shadow-sm">
            <div className={`h-10 w-10 rounded-xl ${action.bg} flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
              <action.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">{action.label}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Accès rapide</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-2xl">
            <TrendingUp className="h-16 w-16 text-white" />
          </div>
        </div>

        <div className="max-w-xl text-center space-y-4">
          <h2 className="text-4xl font-extrabold tracking-tight">Bonjour, {data.profile?.full_name?.split(" ")[0] || "investisseur"} 👋</h2>
          <p className="text-xl text-muted-foreground">
            Prêt à devenir le pilote de votre patrimoine ? <br />
            WealthPilot analyse votre situation pour optimiser votre avenir financier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { icon: Shield, title: "Profil de risque IA", desc: "Analyse profonde de votre tolérance psychologique" },
            { icon: PieChart, title: "Portefeuille optimal", desc: "Allocation personnalisée en ETFs canadiens" },
            { icon: Lightbulb, title: "Conseils fiscaux", desc: "Optimisation de vos CELI, REER et REEE" }
          ].map((feat, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <feat.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-bold text-sm mb-1">{feat.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        <Link href="/onboarding" className="mt-4">
          <Button size="lg" className="h-14 px-10 gap-3 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform group">
            Commencer mon évaluation
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Bonjour, {data.profile?.full_name?.split(" ")[0] || "investisseur"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Votre cockpit financier est à jour.</p>
        </div>
        
        {/* Wealth Score indicator */}
        <div className="flex items-center gap-4 p-3 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="relative h-12 w-12">
             <svg className="h-full w-full" viewBox="0 0 36 36">
                <path className="stroke-muted fill-none" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="stroke-primary fill-none transition-all duration-1000" strokeDasharray={`${Math.min(100, savingsRate * 2)}, 100`} strokeLinecap="round" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
               {savingsRate}%
             </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Taux d&apos;épargne</p>
            <p className="text-sm font-bold">
              {savingsRate >= 30 ? "Excellent 🚀" : savingsRate >= 20 ? "Bon travail 👍" : savingsRate >= 10 ? "En progrès" : savingsRate > 0 ? "À améliorer" : "Non renseigné"}
            </p>
          </div>
        </div>
      </div>

      {/* Market Ticker */}
      <MarketTicker />

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* C.1 — Net Worth */}
        <Card className="group relative overflow-hidden border-none shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 opacity-100 group-hover:opacity-80 transition-opacity" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-5 w-5" />
              </div>
              {trendPct !== null && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendPct >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
                  {trendPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}%
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Actifs Totaux</p>
              <p className="text-3xl font-black mt-1 tracking-tight">{formatCurrency(totalInvested)}</p>
              
              {totalRegistered > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {celiBalance > 0 && (
                    <Badge variant="outline" className="text-[9px] h-5 bg-background/50 border-emerald-500/20">
                      CELI {Math.round(celiBalance / totalRegistered * 100)}%
                    </Badge>
                  )}
                  {reerBalance > 0 && (
                    <Badge variant="outline" className="text-[9px] h-5 bg-background/50 border-blue-500/20">
                      REER {Math.round(reerBalance / totalRegistered * 100)}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* C.2 — Projection 1 an */}
        <Card className="group relative overflow-hidden border-none shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none text-[10px]">PROJECTION</Badge>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cible 1 an</p>
              <p className="text-3xl font-black mt-1 tracking-tight text-blue-700 dark:text-blue-300">
                {projectedValue > 0 ? formatCurrency(projectedValue) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                {expectedReturn > 0 ? `Inclus ${expectedReturn}% de rendement estimé` : "Aucun portefeuille sélectionné"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Score de Risque */}
        <Card className="group relative overflow-hidden border-none shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-rose-500/10 dark:from-orange-500/20 dark:to-rose-500/20" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Shield className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-none text-[10px]">PROFIL</Badge>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Score de Risque</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black mt-1 tracking-tight text-orange-700 dark:text-orange-300">
                  {data.riskAssessment?.risk_score || "—"}<span className="text-sm font-medium opacity-50">/10</span>
                </p>
              </div>
              <div className="mt-2">
                <Badge className="bg-orange-600 text-white border-none text-[9px] tracking-wide uppercase">
                  {riskProfile?.label || "Non évalué"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* C.4 — Épargne mensuelle */}
        <Card className="group relative overflow-hidden border-none shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <PiggyBank className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-none text-[10px]">ÉPARGNE</Badge>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Capacité Mensuelle</p>
              <p className="text-3xl font-black mt-1 tracking-tight text-purple-700 dark:text-purple-300">
                {monthlySavings > 0 ? formatCurrency(monthlySavings) : "—"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, savingsRate * 2)}%` }} />
                </div>
                <span className="text-[10px] font-bold text-purple-600">{savingsRate}%</span>
              </div>
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
          <Card className="border-dashed flex items-center justify-center text-center p-6">
            <div className="space-y-3">
              <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Sélectionnez un portefeuille pour voir votre test de résilience.</p>
              <Link href="/portfolio">
                <Button variant="outline" size="sm">Gérer mon portefeuille</Button>
              </Link>
            </div>
          </Card>
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
