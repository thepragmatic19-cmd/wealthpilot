"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
const NetWorthChart = dynamic(
  () => import("@/components/dashboard/net-worth-chart").then((m) => ({ default: m.NetWorthChart })),
  { ssr: false, loading: () => <Skeleton className="h-[260px] w-full" /> }
);
const AllocationChart = dynamic(
  () => import("@/components/portfolio/allocation-chart").then((m) => ({ default: m.AllocationChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> }
);
const ActivityTimeline = dynamic(
  () => import("@/components/dashboard/activity-timeline").then((m) => ({ default: m.ActivityTimeline })),
  { ssr: false, loading: () => <Skeleton className="h-[180px] w-full" /> }
);
const AiInsightsPanel = dynamic(
  () => import("@/components/dashboard/ai-insights-panel").then((m) => ({ default: m.AiInsightsPanel })),
  { ssr: false, loading: () => <Skeleton className="h-[120px] w-full" /> }
);
const MarketTicker = dynamic(
  () => import("@/components/dashboard/market-ticker").then((m) => ({ default: m.MarketTicker })),
  { ssr: false, loading: () => <Skeleton className="h-10 w-full" /> }
);
import { computeWeightedMer } from "@/lib/portfolio/helpers";
import { formatCurrency, RISK_PROFILES, GOAL_ICONS } from "@/lib/utils";
import { ErrorBoundary } from "@/components/error-boundary";
import { useSimpleMode } from "@/contexts/simple-mode-context";
import { EmptyState } from "@/components/ui/empty-state";
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
  CheckCircle2,
  Circle,
  User,
  X,
  AlertCircle,
} from "lucide-react";
import { WelcomeModal } from "@/components/dashboard/welcome-modal";
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { href: "/chat", icon: MessageSquare, label: "Chat IA", sublabel: "Conseiller IA", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 hover:bg-blue-500/20" },
        { href: "/transactions", icon: Calculator, label: "Transaction", sublabel: "Ajouter", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 hover:bg-emerald-500/20" },
        { href: "/portfolio", icon: PieChart, label: "Portefeuille", sublabel: "Voir mon plan", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 hover:bg-orange-500/20" },
        { href: "/goals", icon: Target, label: "Objectifs", sublabel: "Ma progression", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 hover:bg-purple-500/20" },
      ].map((action, i) => (
        <Link key={i} href={action.href}>
          <div className={`group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl ${action.bg} transition-all cursor-pointer text-center shadow-sm hover:shadow-md hover:-translate-y-0.5`}>
            <div className={`h-11 w-11 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform shadow-sm`}>
              <action.icon className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-sm font-bold ${action.color}`}>{action.label}</p>
              <p className="text-[10px] text-muted-foreground">{action.sublabel}</p>
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

// ─── Checklist Widget (F-1) ───────────────────────────────────────────────────

function ChecklistWidget({ data }: { data: DashboardData }) {
  const steps = [
    { label: "Créer votre compte", done: true },
    { label: "Compléter votre profil", done: !!data.clientInfo?.annual_income },
    { label: "Passer l'évaluation de risque", done: !!data.riskAssessment },
    { label: "Définir un objectif de vie", done: data.goals.length > 0 },
    { label: "Générer votre portefeuille", done: !!data.selectedPortfolio },
    { label: "Poser une question à l'IA", done: data.chatMessages.some((m) => m.role === "user") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const circumference = 2 * Math.PI * 15;
  const nextIdx = steps.findIndex((s) => !s.done);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-primary/5 to-background border-b">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-muted" />
            <circle
              cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
              className="stroke-primary transition-all duration-700"
              strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black text-primary">{pct}%</span>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-sm">Guide de démarrage</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{doneCount} / {steps.length} étapes complétées</p>
        </div>
      </div>
      <div className="divide-y">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${step.done ? "opacity-50" : "hover:bg-muted/30"}`}>
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                {i === nextIdx && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
              </div>
            )}
            <span className={`text-xs font-medium flex-1 ${step.done ? "line-through" : "text-foreground"}`}>
              {step.label}
            </span>
            {!step.done && i === nextIdx && (
              <Badge className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-none font-bold">À faire</Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Health Score Card ────────────────────────────────────────────────────────

function HealthScoreCard({ data }: { data: DashboardData }) {
  const annualIncome = Number(data.clientInfo?.annual_income || 0);
  const monthlySavings = Number(data.clientInfo?.monthly_savings || 0);
  const savingsRate = annualIncome > 0 ? Math.round((monthlySavings * 12 / annualIncome) * 100) : 0;

  const pillars = [
    {
      label: "Profil complet",
      done: !!(data.clientInfo?.annual_income && data.clientInfo?.monthly_savings),
      href: "/profile",
      Icon: User,
      hint: "Nos analyses seront 3× plus précises avec votre revenu et épargne",
    },
    {
      label: "Comptes enregistrés",
      done: !!(data.clientInfo?.has_celi || data.clientInfo?.has_reer),
      href: "/fiscal",
      Icon: Shield,
      hint: "Un CELI bien utilisé peut vous faire économiser des milliers $ d'impôts",
    },
    {
      label: "Objectif de vie",
      done: data.goals.length > 0,
      href: "/goals",
      Icon: Target,
      hint: "Se fixer un objectif augmente vos chances de l'atteindre de 42 %",
    },
    {
      label: "Épargne saine (≥10%)",
      done: savingsRate >= 10,
      href: "/profile",
      Icon: TrendingUp,
      hint: "Épargner 10 % de votre revenu vous met sur la voie de la liberté financière",
    },
  ];

  const doneCount = pillars.filter((p) => p.done).length;
  const score = doneCount * 25;

  const { grade, gradeColor, gradeBorder, gradeBg, message } =
    score === 100
      ? { grade: "A+", gradeColor: "text-emerald-600 dark:text-emerald-400", gradeBorder: "border-emerald-500", gradeBg: "bg-emerald-500/10", message: "Votre situation financière est excellente 🎉" }
      : score >= 75
      ? { grade: "B", gradeColor: "text-green-600 dark:text-green-400", gradeBorder: "border-green-500", gradeBg: "bg-green-500/10", message: "Bonne situation, quelques points à améliorer" }
      : score >= 50
      ? { grade: "C", gradeColor: "text-amber-600 dark:text-amber-400", gradeBorder: "border-amber-500", gradeBg: "bg-amber-500/10", message: "Des actions importantes vous attendent" }
      : { grade: "D", gradeColor: "text-orange-600 dark:text-orange-400", gradeBorder: "border-orange-500", gradeBg: "bg-orange-500/10", message: "Commençons par les bases" };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-2xl border-2 ${gradeBorder} ${gradeBg} ${gradeColor}`}>
              {grade}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Santé financière</p>
              <p className={`text-sm font-semibold ${gradeColor}`}>{message}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {doneCount}/4 piliers
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {pillars.map((pillar, i) => {
            if (pillar.done) {
              return (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-xs text-muted-foreground line-through">{pillar.label}</span>
                </div>
              );
            }
            return (
              <Link key={i} href={pillar.href}>
                <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-muted/10 border border-dashed hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      <span className="text-xs font-medium truncate">{pillar.label}</span>
                    </div>
                    <Badge className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-none font-bold shrink-0">À faire</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug pl-6">{pillar.hint}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface NetWorthSnapshot {
  snapshot_date: string;
  total_assets: number | null;
  total_debts: number | null;
  net_worth: number | null;
}

interface DashboardData {
  profile: Profile | null;
  clientInfo: ClientInfo | null;
  goals: Goal[];
  riskAssessment: RiskAssessment | null;
  selectedPortfolio: (Portfolio & { allocations: PortfolioAllocation[] }) | null;
  chatMessages: ChatMessage[];
  snapshots: NetWorthSnapshot[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    profile: null,
    clientInfo: null,
    goals: [],
    riskAssessment: null,
    selectedPortfolio: null,
    chatMessages: [],
    snapshots: [],
  });
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingSecondary, setLoadingSecondary] = useState(true);
  const [error, setError] = useState(false);
  const [celiBannerDismissed, setCeliBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("wp_celi_banner_dismissed")) {
      setCeliBannerDismissed(true);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingMain(false);
        setLoadingSecondary(false);
        return;
      }

      // Batch 1 (fast): profile, clientInfo, riskAssessment, chatMessages
      Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("client_info").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("risk_assessments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(20),
      ]).then(([{ data: profile }, { data: clientInfo }, { data: riskAssessment }, { data: chatMsgs }]) => {
        // Fire-and-forget today's net worth snapshot
        if (clientInfo) {
          fetch("/api/net-worth/snapshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              total_assets: clientInfo.total_assets,
              total_debts: clientInfo.total_debts,
            }),
          }).catch(() => {});
        }
        setData((prev) => ({
          ...prev,
          profile: profile as Profile | null,
          clientInfo: clientInfo as ClientInfo | null,
          riskAssessment: riskAssessment as RiskAssessment | null,
          chatMessages: (chatMsgs as ChatMessage[]) || [],
        }));
      }).catch((err) => {
        logger.error("Dashboard load error (batch 1):", err);
        setError(true);
      }).finally(() => {
        setLoadingMain(false);
      });

      // Batch 2 (parallel): portfolio, goals, snapshots
      Promise.all([
        supabase
          .from("portfolios")
          .select("*, portfolio_allocations(*)")
          .eq("user_id", user.id)
          .eq("is_selected", true)
          .maybeSingle(),
        supabase.from("goals").select("*").eq("user_id", user.id).order("priority"),
        fetch("/api/net-worth/snapshot")
          .then((r) => (r.ok ? r.json() : { snapshots: [] }))
          .catch(() => ({ snapshots: [] })),
      ]).then(([portfolioRes, goalsRes, snapshotsData]) => {
        const portfolio = portfolioRes.data;
        const goals = goalsRes.data;
        setData((prev) => ({
          ...prev,
          selectedPortfolio: portfolio
            ? ({
                ...portfolio,
                allocations: portfolio.portfolio_allocations || [],
              } as Portfolio & { allocations: PortfolioAllocation[] })
            : null,
          goals: (goals as Goal[]) || [],
          snapshots: snapshotsData.snapshots || [],
        }));
      }).catch((err) => {
        logger.error("Dashboard load error (batch 2):", err);
      }).finally(() => {
        setLoadingSecondary(false);
      });
    }
    load();
  }, []);

  if (loadingMain) {
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

  const { isSimple } = useSimpleMode();

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

  const checklistDone = [
    !!data.clientInfo?.annual_income,
    !!data.riskAssessment,
    data.goals.length > 0,
    !!data.selectedPortfolio,
    data.chatMessages.some((m) => m.role === "user"),
  ].every(Boolean);

  const allocations = data.selectedPortfolio?.allocations || [];
  const actionsWeight = Math.round(
    allocations
      .filter((a) => /action|equity|stock/i.test(a.asset_class || "") || /action|equity|stock/i.test(a.instrument_name || ""))
      .reduce((sum, a) => sum + (a.weight || 0), 0)
  );
  const obligationsWeight = 100 - actionsWeight;

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

  const showCeliBanner = !celiBannerDismissed && !data.clientInfo?.has_celi;

  return (
    <div className="space-y-6 pb-10">
      <WelcomeModal />
      <div className="rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-muted/20 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-black text-primary shadow-sm shrink-0">
              {(data.profile?.full_name?.split(" ")[0] || "W")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tableau de bord</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Bonjour, {data.profile?.full_name?.split(" ")[0] || "investisseur"} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isSimple
                  ? "Voici un résumé simple de votre situation financière."
                  : "Votre cockpit financier est à jour."}
              </p>
            </div>
          </div>

          {/* Taux d'épargne — masqué en mode simplifié (valeur souvent confuse) */}
          {!isSimple && savingsRate > 0 && savingsRate <= 100 && (
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
                  {savingsRate >= 30 ? "Excellent 🚀" : savingsRate >= 20 ? "Bon travail 👍" : savingsRate >= 10 ? "En progrès" : "À améliorer"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CELI banner — shown when user has no CELI account */}
      {showCeliBanner && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3.5">
          <AlertCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Vous n&apos;utilisez pas votre CELI
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              Les Canadiens ont en moyenne <strong>30 000 $</strong> de droits CELI inutilisés — c&apos;est de la croissance imposable que vous payez inutilement.{" "}
              <Link href="/fiscal" className="underline underline-offset-2 font-semibold hover:opacity-80">
                Ouvrir un CELI →
              </Link>
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("wp_celi_banner_dismissed", "1");
              setCeliBannerDismissed(true);
            }}
            className="p-1 rounded-full hover:bg-emerald-200/60 dark:hover:bg-emerald-800/40 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>
      )}

      {/* Health Score Card — simple mode only */}
      {isSimple && <HealthScoreCard data={data} />}

      {/* Simple mode: plain-language summary strip */}
      {isSimple && (totalInvested > 0 || monthlySavings > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative overflow-hidden flex items-center gap-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-5 py-5 shadow-sm">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-t-2xl" />
            <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">J&apos;ai en ce moment</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 leading-tight truncate">{formatCurrency(totalInvested)}</p>
            </div>
          </div>
          <div className="relative overflow-hidden flex items-center gap-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 px-5 py-5 shadow-sm">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-400 to-purple-500 rounded-t-2xl" />
            <div className="h-12 w-12 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
              <PiggyBank className="h-6 w-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">J&apos;épargne chaque mois</p>
              <p className="text-2xl font-black text-purple-700 dark:text-purple-400 leading-tight truncate">
                {monthlySavings > 0 ? formatCurrency(monthlySavings) : "—"}
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden flex items-center gap-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 px-5 py-5 shadow-sm">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-t-2xl" />
            <div className="h-12 w-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Dans 1 an, j&apos;aurai environ</p>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-400 leading-tight truncate">
                {projectedValue > 0 ? formatCurrency(projectedValue) : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Market Ticker — hidden in simple mode */}
      {!isSimple && <MarketTicker />}

      {/* Summary Cards — advanced mode only */}
      {!isSimple && <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">{formatCurrency(totalInvested)}</p>

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
              <p className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-blue-700 dark:text-blue-300">
                {projectedValue > 0 ? formatCurrency(projectedValue) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                {expectedReturn > 0 ? `Inclus ${expectedReturn}% de rendement estimé` : "Aucun portefeuille sélectionné"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Score de Risque — hidden in simple mode */}
        {!isSimple && (
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
                  <p className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-orange-700 dark:text-orange-300">
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
        )}

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
              <p className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-purple-700 dark:text-purple-300">
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
      </div>}

      {/* Quick Actions — always visible after KPI cards */}
      <QuickActionsCard />

      {/* Simple mode: show checklist widget prominently — hidden once all steps done */}
      {isSimple && !checklistDone && <ChecklistWidget data={data} />}

      {/* Net Worth Chart — hidden in simple mode */}
      {!isSimple && (
        <ErrorBoundary>
          {loadingSecondary ? <Skeleton className="h-[260px] w-full" /> : <NetWorthChart snapshots={data.snapshots} />}
        </ErrorBoundary>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Secondary loading skeletons */}
        {loadingSecondary && (
          <>
            <Skeleton className="lg:col-span-2 h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </>
        )}

        {!loadingSecondary && <>
        {/* Simple mode: empty portfolio CTA */}
        {isSimple && !data.selectedPortfolio && (
          <Card className="lg:col-span-2 border-dashed border-2 flex items-center justify-center p-8 text-center bg-muted/10">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <PieChart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold mb-1">Découvrez votre portefeuille idéal</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                En 5 minutes, obtenez une allocation personnalisée en ETFs canadiens.
              </p>
              <Link href="/portfolio">
                <Button>Voir les portefeuilles <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Portfolio allocation + metrics row */}
        {data.selectedPortfolio && (
          <ErrorBoundary>
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

              {/* Simple mode: 1-sentence portfolio summary */}
              {isSimple && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  Votre portefeuille est composé d&apos;environ{" "}
                  <strong>{actionsWeight}% d&apos;actions</strong> et{" "}
                  <strong>{obligationsWeight}% d&apos;obligations</strong> —{" "}
                  adapté à votre profil{" "}
                  <strong>{riskProfile?.label?.toLowerCase() || "équilibré"}</strong>.
                </p>
              )}

              {/* Portfolio metrics: expected return, volatility, Sharpe, MER — hidden in simple mode */}
              {!isSimple && (
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
              )}

              {/* F-3: "Ce que ça veut dire pour toi" — plain-language projection */}
              {(() => {
                const ret = data.selectedPortfolio.expected_return || 0;
                const monthly = monthlySavings;
                const current = totalInvested;
                const horizon = 20;
                if (ret <= 0 || (monthly <= 0 && current <= 0)) return null;
                const r = ret / 100 / 12;
                const projected20 = r > 0
                  ? current * Math.pow(1 + r, horizon * 12) + monthly * ((Math.pow(1 + r, horizon * 12) - 1) / r)
                  : current + monthly * horizon * 12;
                const merAmt = merDisplay ? Math.round((parseFloat(merDisplay) / 100) * current) : null;
                // Cost of waiting 6 months: difference between starting now vs starting in 6 months
                const costOfDelay = r > 0
                  ? Math.round(monthly * ((Math.pow(1 + r, horizon * 12) - Math.pow(1 + r, horizon * 12 - 6)) / r))
                  : Math.round(monthly * 6);
                return (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Ce que ça veut dire pour vous</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                        <p className="text-xs text-muted-foreground">Dans 20 ans (avec {monthly > 0 ? `${formatCurrency(monthly)}/mois` : "vos actifs actuels"})</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(Math.round(projected20))}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">à {ret}% de rendement annuel</p>
                      </div>
                      {merAmt !== null && (
                        <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-3">
                          <p className="text-xs text-muted-foreground">Frais de gestion (RFG) estimés</p>
                          <p className="text-xl font-black text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(merAmt)}/an</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">sur vos {formatCurrency(current)} actuels</p>
                        </div>
                      )}
                      {monthly > 0 && costOfDelay > 0 && (
                        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
                          <p className="text-xs text-muted-foreground">Coût d&apos;attendre 6 mois</p>
                          <p className="text-xl font-black text-red-600 dark:text-red-400 mt-1">−{formatCurrency(costOfDelay)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">manqués sur 20 ans si vous commencez plus tard</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          </ErrorBoundary>
        )}

        {/* Goals with days-remaining badges */}
        <ErrorBoundary>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Objectifs de vie
              </CardTitle>
              <CardDescription>Suivi de votre progression</CardDescription>
            </div>
            <Link href="/goals">
              <Button variant="outline" size="sm" className="gap-1">
                Gérer <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            {data.goals.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Aucun objectif"
                description="Définissez vos objectifs pour visualiser votre progression."
                action={{ label: "Créer un objectif", href: "/goals" }}
              />
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
                            className={`text-[10px] px-1.5 py-0 ${daysRemaining < 0
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
        </ErrorBoundary>
        </>}
      </div>

      {/* Strategic Insights Row — 3-column layout */}
      <div className="grid gap-4 lg:grid-cols-3">
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
        <ErrorBoundary><AiInsightsPanel /></ErrorBoundary>

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

        {/* Row 2: Activity Timeline + Checklist in advanced mode */}
        <div className="lg:col-span-3 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ErrorBoundary>
              <ActivityTimeline
                goals={data.goals}
                chatMessages={data.chatMessages}
                portfolios={data.selectedPortfolio ? [data.selectedPortfolio] : []}
                profileUpdated={data.profile?.updated_at}
              />
            </ErrorBoundary>
          </div>
          <ChecklistWidget data={data} />
        </div>
      </div>
    </div>
  );
}
