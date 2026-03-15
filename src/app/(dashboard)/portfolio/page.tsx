"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
const AllocationChart = dynamic(
  () => import("@/components/portfolio/allocation-chart").then((m) => ({ default: m.AllocationChart })),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> }
);
const ProjectionChart = dynamic(
  () => import("@/components/portfolio/projection-chart").then((m) => ({ default: m.ProjectionChart })),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full rounded-lg" /> }
);
const RiskReturnChart = dynamic(
  () => import("@/components/portfolio/risk-return-chart").then((m) => ({ default: m.RiskReturnChart })),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> }
);
const PerformanceChart = dynamic(
  () => import("@/components/portfolio/performance-chart").then((m) => ({ default: m.PerformanceChart })),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full rounded-lg" /> }
);
const ExportPdfButton = dynamic(
  () => import("@/components/portfolio/export-pdf-button").then((m) => ({ default: m.ExportPdfButton })),
  { ssr: false, loading: () => null }
);
const EtfPricesTable = dynamic(
  () => import("@/components/portfolio/etf-prices-table").then((m) => ({ default: m.EtfPricesTable })),
  { ssr: false, loading: () => null }
);
import { formatPercent, formatCurrency, ASSET_CLASS_COLORS } from "@/lib/utils";
import { useSimpleMode } from "@/contexts/simple-mode-context";
import { FloatingHelpButton } from "@/components/ui/floating-help-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FINANCIAL_TERMS } from "@/lib/financial-terms";
import { toast } from "sonner";
import { CheckCircle, TrendingUp, Shield, BarChart3, Star, Info, RefreshCw, Loader2, Download, Scale, FileBarChart2, LayoutGrid, Sparkles } from "lucide-react";
import { computeWeightedMer, computeAccountSummary } from "@/lib/portfolio/helpers";
import type { Portfolio, PortfolioAllocation, ClientInfo, Transaction } from "@/types/database";
import { Input } from "@/components/ui/input";

// Simple French descriptions of common ETFs — shown in beginner mode
const ETF_SIMPLE_DESC: Record<string, string> = {
  "VFV.TO": "Grandes entreprises américaines (Apple, Microsoft, Nvidia...)",
  "XIC.TO": "Entreprises canadiennes (RBC, TD, Shopify, CNR...)",
  "ZCN.TO": "Entreprises canadiennes — indice TSX complet",
  "XIU.TO": "60 plus grandes entreprises canadiennes",
  "XAW.TO": "Entreprises mondiales, hors Canada",
  "XEF.TO": "Entreprises européennes et asiatiques développées",
  "XEM.TO": "Marchés émergents (Chine, Inde, Brésil...)",
  "XEQT.TO": "Actions mondiales complètes en 1 seul ETF",
  "XBAL.TO": "Portefeuille équilibré mondial (60% actions, 40% obligations)",
  "XGRO.TO": "Portefeuille croissance mondial (80% actions, 20% obligations)",
  "VEQT.TO": "Actions mondiales Vanguard en 1 seul ETF",
  "VGRO.TO": "Portefeuille croissance Vanguard (80% actions)",
  "VBAL.TO": "Portefeuille équilibré Vanguard (60% actions)",
  "ZAG.TO": "Obligations canadiennes — stabilité et revenus fixes",
  "VAB.TO": "Obligations canadiennes Vanguard — protection contre la volatilité",
  "XBB.TO": "Obligations canadiennes iShares — large spectre",
  "XSB.TO": "Obligations canadiennes à court terme — peu sensibles aux taux",
  "ZFL.TO": "Obligations canadiennes à long terme — sensibles aux taux",
  "ZRE.TO": "Fiducies immobilières canadiennes (FPI/REIT)",
  "XRE.TO": "Immobilier canadien — loyers et biens immobiliers",
  "HXS.TO": "S&P 500 — version fiscalement avantageuse (pas de dividendes imposables)",
  "CASH.TO": "Liquidités à rendement élevé — équivalent compte d'épargne",
  "PSA.TO": "Liquidités à rendement élevé — très peu de risque",
  "ZEB.TO": "Banques canadiennes (RBC, TD, BNS, BMO, CIBC, NA)",
  "ZEO.TO": "Énergie canadienne (pipelines, pétrole et gaz)",
  "XGD.TO": "Or et mines d'or canadiennes",
  "CGL.TO": "Or physique — protection contre l'inflation",
};

interface PortfolioWithAllocations extends Portfolio {
  allocations: PortfolioAllocation[];
}

const ACCOUNT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  'CELI': { label: 'CELI', variant: 'default' },
  'REER': { label: 'REER', variant: 'secondary' },
  'REEE': { label: 'REEE', variant: 'outline' },
  'non_enregistré': { label: 'Non-enr.', variant: 'outline' },
};

function MetricLabel({ label }: { label: string }) {
  const tooltip = FINANCIAL_TERMS[label];
  if (!tooltip) return <p className="text-sm text-muted-foreground">{label}</p>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1 cursor-help">
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

function getStabiliteLabel(vol: number) {
  if (vol <= 8)  return { label: "Stable",     color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" };
  if (vol <= 15) return { label: "Équilibré",  color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" };
  return          { label: "Dynamique",    color: "text-red-700 dark:text-red-400",   bg: "bg-red-50 dark:bg-red-900/20" };
}

function StabiliteGauge({ volatility }: { volatility: number }) {
  const s = getStabiliteLabel(volatility);
  const pct = Math.min(100, (volatility / 25) * 100);
  return (
    <div className={`rounded-xl p-4 ${s.bg} space-y-2`}>
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stabilité</p>
        <span className={`text-sm font-bold ${s.color}`}>{s.label}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            s.label === "Stable" ? "bg-green-500" : s.label === "Équilibré" ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {s.label === "Stable"
          ? "Peu de fluctuations — idéal si vous aimez la sécurité"
          : s.label === "Équilibré"
          ? "Fluctuations modérées — bon équilibre risque/rendement"
          : "Fluctuations importantes — potentiel élevé, patience requise"}
      </p>
    </div>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const { isSimple, toggle: toggleSimple } = useSimpleMode();
  const [simpleActiveId, setSimpleActiveId] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioWithAllocations[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [totalValueOverride, setTotalValueOverride] = useState<Record<string, number>>({});
  const [savingRebalance, setSavingRebalance] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [currentRiskProfile, setCurrentRiskProfile] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: portfolioData }, { data: clientData }, { data: riskData }] = await Promise.all([
          supabase
            .from("portfolios")
            .select("*, portfolio_allocations(*)")
            .eq("user_id", user.id),
          supabase
            .from("client_info")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("risk_assessments")
            .select("risk_profile")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (riskData) setCurrentRiskProfile(riskData.risk_profile);

        if (portfolioData) {
          const mapped = portfolioData.map((p) => ({
            ...p,
            allocations: p.portfolio_allocations || [],
          })) as PortfolioWithAllocations[];
          setPortfolios(mapped);
          const selectedOrSuggested = mapped.find((p) => p.is_selected) ?? mapped.find((p) => p.type === "suggéré") ?? mapped[0];
          if (selectedOrSuggested) setActiveTab(selectedOrSuggested.type);

          // Fetch transactions for each portfolio
          const portfolioIds = mapped.map((p) => p.id);
          if (portfolioIds.length > 0) {
            const { data: txData } = await supabase
              .from("transactions")
              .select("*")
              .in("portfolio_id", portfolioIds)
              .order("executed_at", { ascending: true });

            if (txData) {
              const grouped: Record<string, Transaction[]> = {};
              for (const tx of txData as Transaction[]) {
                if (!grouped[tx.portfolio_id]) grouped[tx.portfolio_id] = [];
                grouped[tx.portfolio_id].push(tx);
              }
              setTransactions(grouped);
            }
          }
        }
        if (clientData) setClientInfo(clientData as ClientInfo);
      } catch (err) {
        logger.error("Portfolio load error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function selectPortfolio(portfolioId: string) {
    setSelecting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deselect all then select the chosen one
      const { error: deselectError } = await supabase
        .from("portfolios")
        .update({ is_selected: false })
        .eq("user_id", user.id);

      if (deselectError) throw deselectError;

      const { error: selectError } = await supabase
        .from("portfolios")
        .update({ is_selected: true })
        .eq("id", portfolioId)
        .eq("user_id", user.id); // Also filter by user for safety

      if (selectError) throw selectError;

      const selectedPort = portfolios.find((p) => p.id === portfolioId);
      setPortfolios((prev) =>
        prev.map((p) => ({ ...p, is_selected: p.id === portfolioId }))
      );
      toast.success("Portefeuille sélectionné", {
        action: {
          label: "💬 Expliquer ce portefeuille",
          onClick: () => router.push(`/chat?q=${encodeURIComponent("Explique-moi mon nouveau portefeuille " + (selectedPort?.name || "") + " et ses ETFs")}`),
        },
        duration: 6000,
      });
    } catch (err) {
      logger.error("Portfolio selection error:", err);
      toast.error("Erreur lors de la sélection du portefeuille");
    } finally {
      setSelecting(false);
    }
  }

  async function regeneratePortfolios() {
    if (!confirm("Régénérer vos portefeuilles avec l'IA ? Vos portefeuilles actuels seront remplacés.")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.portfolios && data.portfolios.length > 0) {
        const mapped = data.portfolios.map((p: PortfolioWithAllocations) => ({
          ...p,
          allocations: p.allocations || [],
        })) as PortfolioWithAllocations[];
        setPortfolios(mapped);
        if (data.aiGenerated) {
          toast.success("Portefeuilles régénérés par l'IA ✓");
        } else {
          toast.warning("Modèles standard utilisés — complétez votre profil pour activer l'IA");
        }
      }
    } catch {
      toast.error("Erreur lors de la régénération");
    } finally {
      setRegenerating(false);
    }
  }

  function downloadAllocationsCSV(portfolio: PortfolioWithAllocations) {
    const header = "Titre,Ticker,Classe,Sous-classe,Poids (%),Rendement attendu (%),MER (%),Compte suggéré\n";
    const rows = portfolio.allocations.map((a) =>
      [
        `"${a.instrument_name}"`,
        a.instrument_ticker,
        a.asset_class,
        a.sub_class || "",
        a.weight,
        a.expected_return ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a as any).mer ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a as any).suggested_account ?? "",
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portefeuille-${portfolio.type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveRebalancingTransactions(
    portfolio: PortfolioWithAllocations,
    rebalancingRows: Array<{
      ticker: string;
      name: string;
      suggestedAccount: string | null;
      delta: number;
      action: "ACHETER" | "VENDRE" | "ÉQUILIBRÉ";
    }>
  ) {
    setSavingRebalance(portfolio.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const toSave = rebalancingRows
        .filter((r) => r.action !== "ÉQUILIBRÉ")
        .map((r) => ({
          user_id: user.id,
          portfolio_id: portfolio.id,
          type: "rééquilibrage" as const,
          instrument_ticker: r.ticker,
          instrument_name: r.name,
          quantity: null,
          price: null,
          amount: Math.abs(r.delta),
          account: r.suggestedAccount as Transaction["account"],
          notes: `Rééquilibrage — ${r.action === "ACHETER" ? "achat" : "vente"} ${Math.abs(r.delta).toLocaleString("fr-CA")}$`,
          executed_at: new Date().toISOString(),
        }));

      if (toSave.length === 0) {
        toast.info("Portefeuille déjà équilibré");
        return;
      }

      const { error } = await supabase.from("transactions").insert(toSave);
      if (error) throw error;
      toast.success(`${toSave.length} transaction(s) de rééquilibrage enregistrée(s)`);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingRebalance(null);
    }
  }

  async function generateQuarterlyReport(portfolio: PortfolioWithAllocations) {
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/ai/quarterly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId: portfolio.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.upgradeRequired) {
          toast.error("Rapport trimestriel disponible avec Pro ou Élite");
          return;
        }
        throw new Error("API error");
      }
      const { narrative, data: reportData } = await res.json();
      const { generateQuarterlyReportPDF } = await import("@/lib/pdf/quarterly-report-pdf");
      await generateQuarterlyReportPDF({ portfolio, narrative, reportData });
      toast.success("Rapport trimestriel téléchargé");
    } catch {
      toast.error("Erreur lors de la génération du rapport");
    } finally {
      setGeneratingReport(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <p className="text-lg font-semibold text-destructive">Erreur de chargement</p>
          <p className="text-muted-foreground">Impossible de charger vos portefeuilles.</p>
          <Button onClick={() => window.location.reload()}>Rafraîchir</Button>
        </CardContent>
      </Card>
    );
  }

  if (portfolios.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Aucun portefeuille</h2>
          <p className="text-muted-foreground">
            Complétez l&apos;onboarding pour recevoir vos recommandations personnalisées.
          </p>
          <Button onClick={() => router.push("/onboarding")}>
            Commencer l&apos;onboarding
          </Button>
        </CardContent>
      </Card>
    );
  }

  const typeOrder = ["conservateur", "suggéré", "ambitieux"];
  const sorted = [...portfolios].sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  );
  const selected = sorted.find((p) => p.is_selected) ?? sorted[1] ?? sorted[0] ?? null;
  const simplePortfolio =
    (simpleActiveId ? sorted.find((p) => p.id === simpleActiveId) : null) ??
    sorted.find((p) => p.is_selected) ??
    sorted.find((p) => p.type === "suggéré") ??
    sorted[0] ??
    null;

  const riskReturnData = sorted.map((p) => ({
    name: p.name,
    volatility: p.volatility || 0,
    expectedReturn: p.expected_return || 0,
    color:
      p.type === "conservateur"
        ? "#3b82f6"
        : p.type === "suggéré"
        ? "#22c55e"
        : "#f59e0b",
  }));

  const initialInvestment = Number(clientInfo?.total_assets || 10000);
  const monthlyContribution = Number(clientInfo?.monthly_savings || 500);

  const simpleMerAvg = simplePortfolio ? computeWeightedMer(simplePortfolio.allocations) : null;
  const simpleInitialInvestment = Number(clientInfo?.total_assets || 10000);
  const simpleMonthlyContribution = Number(clientInfo?.monthly_savings || 500);
  const simpleExpectedReturn = (simplePortfolio?.expected_return ?? 5) / 100;
  // 20yr projection inline
  const simpleProjection20yr = (() => {
    let val = simpleInitialInvestment;
    const monthlyRate = simpleExpectedReturn / 12;
    for (let m = 0; m < 240; m++) {
      val = val * (1 + monthlyRate) + simpleMonthlyContribution;
    }
    return Math.round(val);
  })();

  const SIMPLE_LABELS: Record<string, string> = {
    "conservateur": "Prudent",
    "suggéré": "Recommandé",
    "ambitieux": "Ambitieux",
  };

  return (
    <div className="space-y-6">
      {isSimple && simplePortfolio ? (
        <>
          {/* Simple mode header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mon portefeuille</h1>
              <p className="text-sm text-muted-foreground">Vue simplifiée — l&apos;essentiel pour décider</p>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleSimple} className="text-muted-foreground gap-1">
              Vue avancée →
            </Button>
          </div>

          {/* 3 quick portfolio cards */}
          <div className="grid grid-cols-3 gap-2">
            {sorted.map((p) => {
              const isActive = p.id === simplePortfolio.id;
              const label = SIMPLE_LABELS[p.type] ?? p.type;
              const s = getStabiliteLabel(p.volatility ?? 0);
              return (
                <button
                  key={p.id}
                  onClick={() => setSimpleActiveId(p.id)}
                  className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                    isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {p.type === "suggéré" && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />}
                    <span className="text-xs font-semibold truncate">{label}</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">+{p.expected_return?.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground mb-1">par an</p>
                  <span className={`text-[10px] font-semibold ${s.color}`}>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stabilite gauge */}
          <StabiliteGauge volatility={simplePortfolio.volatility ?? 0} />

          {/* 2 decoded metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Croissance estimée</p>
                <p className="text-xl font-bold text-green-600">+{simplePortfolio.expected_return?.toFixed(1)}%/an</p>
                <p className="text-[11px] text-muted-foreground">en moyenne sur le long terme</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frais annuels</p>
                {simpleInitialInvestment > 0 && simpleMerAvg != null ? (
                  <>
                    <p className="text-xl font-bold">~{formatCurrency(simpleInitialInvestment * parseFloat(simpleMerAvg) / 100)}</p>
                    <p className="text-[11px] text-muted-foreground">{simpleMerAvg}% de votre capital</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold">{simpleMerAvg != null ? `${simpleMerAvg}%` : "—"}</p>
                    <p className="text-[11px] text-muted-foreground">de votre capital par an</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Allocation chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comment votre argent est réparti</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationChart allocations={simplePortfolio.allocations} />
            </CardContent>
          </Card>

          {/* 20yr projection */}
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Projection sur 20 ans</p>
              <p className="text-2xl font-bold">
                Dans 20 ans, votre portefeuille pourrait valoir ~{formatCurrency(simpleProjection20yr)}
              </p>
              <p className="text-xs text-muted-foreground">
                Basé sur {formatCurrency(simpleInitialInvestment)} investis aujourd&apos;hui +{" "}
                {formatCurrency(simpleMonthlyContribution)}/mois, au rendement de{" "}
                {simplePortfolio.expected_return?.toFixed(1)}%/an.
              </p>
            </CardContent>
          </Card>

          {/* AI rationale */}
          {simplePortfolio.ai_rationale && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pourquoi ce portefeuille ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{simplePortfolio.ai_rationale}</p>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          {simplePortfolio.is_selected ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-3">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Portefeuille actif</span>
            </div>
          ) : (
            <Button
              onClick={() => selectPortfolio(simplePortfolio.id)}
              disabled={selecting}
              className="w-full gap-2"
              size="lg"
            >
              <CheckCircle className="h-4 w-4" />
              Sélectionner ce portefeuille
            </Button>
          )}
        </>
      ) : (
        <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vos portefeuilles recommandés</h1>
          <p className="text-muted-foreground">
            Comparez les 3 options et sélectionnez votre portefeuille idéal.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCompareMode((v) => !v)}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            {compareMode ? "Vue normale" : "Comparer"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={regeneratePortfolios}
            disabled={regenerating}
            className="gap-2"
          >
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {regenerating ? "Génération..." : "Régénérer"}
          </Button>
        </div>
      </div>

      {/* Drift banner — shown if risk profile changed since last generation */}
      {currentRiskProfile && portfolios.length > 0 && currentRiskProfile !== portfolios[0]?.risk_profile_at_generation && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 dark:bg-amber-900/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span>Votre profil de risque a changé depuis la dernière génération. Régénérez pour des portefeuilles alignés.</span>
          </div>
          <Button size="sm" variant="outline" onClick={regeneratePortfolios} disabled={regenerating} className="shrink-0">
            Régénérer
          </Button>
        </div>
      )}

      {/* Inline comparison table */}
      {compareMode && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Métrique</th>
                {sorted.map((p) => (
                  <th
                    key={p.id}
                    className={`px-4 py-3 text-center font-semibold capitalize ${p.is_selected ? "bg-primary/5 border-x border-primary/20 text-primary" : ""}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {p.type === "suggéré" && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
                      {p.is_selected && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                      {p.type}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { label: "Rendement attendu", getValue: (p: PortfolioWithAllocations) => `${p.expected_return?.toFixed(1) ?? "—"}%` },
                { label: "Volatilité", getValue: (p: PortfolioWithAllocations) => `${p.volatility?.toFixed(1) ?? "—"}%` },
                { label: "Ratio de Sharpe", getValue: (p: PortfolioWithAllocations) => p.sharpe_ratio?.toFixed(2) ?? "—" },
                { label: "RFG moyen", getValue: (p: PortfolioWithAllocations) => { const m = computeWeightedMer(p.allocations); return m != null ? `${m}%` : "—"; } },
                { label: "Nb ETFs", getValue: (p: PortfolioWithAllocations) => String(p.allocations.length) },
                { label: "Type", getValue: (p: PortfolioWithAllocations) => p.type },
              ].map((row) => (
                <tr key={row.label} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium text-muted-foreground">{row.label}</td>
                  {sorted.map((p) => (
                    <td
                      key={p.id}
                      className={`px-4 py-2.5 text-center font-medium ${p.is_selected ? "bg-primary/5 border-x border-primary/20" : ""}`}
                    >
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3" />
                {sorted.map((p) => (
                  <td
                    key={p.id}
                    className={`px-4 py-3 text-center ${p.is_selected ? "bg-primary/5 border-x border-b border-primary/20" : ""}`}
                  >
                    {p.is_selected ? (
                      <Badge className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Sélectionné
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectPortfolio(p.id)}
                        disabled={selecting}
                      >
                        Sélectionner
                      </Button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Quick comparison cards — horizontal scroll on mobile, 3-col on sm+ */}
      {!compareMode && <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {sorted.map((p) => {
          const avgMer = computeWeightedMer(p.allocations);
          const isSelected = p.is_selected;
          const isSuggested = p.type === "suggéré";
          return (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.type)}
              className={`min-w-[180px] shrink-0 sm:min-w-0 rounded-xl border p-3 text-left transition-all hover:shadow-md ${activeTab === p.type ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{p.type}</span>
                <div className="flex items-center gap-1">
                  {isSuggested && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
                  {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                </div>
              </div>
              <p className="text-xl font-bold text-green-600">{p.expected_return?.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground mb-2">rendement</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-1">
                  <span className="text-muted-foreground shrink-0">Vol.</span>
                  <span className="font-medium text-orange-500">{p.volatility?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-muted-foreground shrink-0">Sharpe</span>
                  <span className="font-medium">{p.sharpe_ratio?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-muted-foreground shrink-0">RFG</span>
                  <span className="font-medium">{avgMer !== null ? `${avgMer}%` : "—"}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>}

      {/* Portfolio tabs */}
      {!compareMode && <Tabs value={activeTab || selected?.type || "suggéré"} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conservateur" className="text-xs sm:text-sm gap-1">
            <Shield className="hidden sm:block h-4 w-4" />
            <span className="truncate">Conservateur</span>
          </TabsTrigger>
          <TabsTrigger value="suggéré" className="gap-1 text-xs sm:text-sm">
            Suggéré <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          </TabsTrigger>
          <TabsTrigger value="ambitieux" className="text-xs sm:text-sm gap-1">
            <TrendingUp className="hidden sm:block h-4 w-4" />
            <span className="truncate">Ambitieux</span>
          </TabsTrigger>
        </TabsList>

        {sorted.map((portfolio) => {
          const avgMer = computeWeightedMer(portfolio.allocations);
          const accountSummary = computeAccountSummary(portfolio.allocations);

          return (
            <TabsContent key={portfolio.id} value={portfolio.type} className="space-y-6 mt-4">
              {/* Header */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{portfolio.name}</CardTitle>
                      <CardDescription className="mt-1">{portfolio.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {portfolio.is_selected && (
                        <Badge className="gap-1" variant="default">
                          <CheckCircle className="h-3 w-3" />
                          Sélectionné
                        </Badge>
                      )}
                      {portfolio.ai_generated
                        ? <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 text-xs">
                            <Sparkles className="h-3 w-3"/>Généré par IA
                          </Badge>
                        : <Badge variant="outline" className="gap-1 text-muted-foreground text-xs">
                            <Shield className="h-3 w-3"/>Modèle standard
                          </Badge>
                      }
                      <ExportPdfButton portfolio={portfolio} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => generateQuarterlyReport(portfolio)}
                        disabled={generatingReport}
                      >
                        {generatingReport ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileBarChart2 className="h-3.5 w-3.5" />
                        )}
                        {generatingReport ? "Génération du rapport..." : "Rapport Q"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => downloadAllocationsCSV(portfolio)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-lg border p-2.5 sm:p-3 text-center">
                      <MetricLabel label="Rendement attendu" />
                      <p className="text-lg font-bold text-green-600 sm:text-2xl mt-1">
                        {formatPercent(portfolio.expected_return || 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-2.5 sm:p-3 text-center">
                      <MetricLabel label="Volatilité" />
                      <p className="text-lg font-bold text-orange-500 sm:text-2xl mt-1">
                        {formatPercent(portfolio.volatility || 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-2.5 sm:p-3 text-center">
                      <MetricLabel label="Ratio de Sharpe" />
                      <p className="text-lg font-bold sm:text-2xl mt-1">{portfolio.sharpe_ratio?.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border p-2.5 sm:p-3 text-center">
                      <MetricLabel label="Perte max. historique" />
                      <p className="text-lg font-bold text-red-500 sm:text-2xl mt-1">
                        -{formatPercent(Math.abs(portfolio.max_drawdown || 0))}
                      </p>
                    </div>
                    <div className="rounded-lg border p-2.5 sm:p-3 text-center col-span-2 sm:col-span-1">
                      <MetricLabel label="RFG moyen pondéré" />
                      <p className="text-lg font-bold sm:text-2xl mt-1">
                        {avgMer !== null ? `${avgMer}%` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Account summary */}
                  {Object.keys(accountSummary).length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Répartition par compte</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(accountSummary).map(([account, weight]) => (
                          <Badge
                            key={account}
                            variant={ACCOUNT_LABELS[account]?.variant || 'outline'}
                            className="text-xs"
                          >
                            {ACCOUNT_LABELS[account]?.label || account}: {weight}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Allocation chart + table */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Allocation d&apos;actifs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AllocationChart allocations={portfolio.allocations} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Détail des instruments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {portfolio.allocations.map((alloc, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg border p-3"
                        >
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                ASSET_CLASS_COLORS[alloc.asset_class] || "#6b7280",
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium truncate">{alloc.instrument_name}</p>
                              {alloc.currency === 'USD' && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">USD</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {alloc.instrument_ticker} • {alloc.asset_class}
                              {alloc.mer != null && ` • RFG ${alloc.mer}%`}
                            </p>
                            {isSimple && alloc.instrument_ticker && ETF_SIMPLE_DESC[alloc.instrument_ticker] && (
                              <p className="text-[11px] text-muted-foreground/70 truncate italic">
                                {ETF_SIMPLE_DESC[alloc.instrument_ticker]}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1">
                              {alloc.suggested_account && ACCOUNT_LABELS[alloc.suggested_account] && (
                                <Badge
                                  variant={ACCOUNT_LABELS[alloc.suggested_account].variant}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {ACCOUNT_LABELS[alloc.suggested_account].label}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">{alloc.weight}%</Badge>
                            </div>
                            {alloc.expected_return && (
                              <p className="text-[10px] text-green-600">
                                +{alloc.expected_return}%/an
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ETF live prices */}
              <EtfPricesTable tickers={portfolio.allocations.map((a) => a.instrument_ticker)} />

              {/* Rebalancing Engine */}
              {(() => {
                const totalValue = totalValueOverride[portfolio.id] ?? Number(clientInfo?.total_assets || 0);
                const portTxs = transactions[portfolio.id] || [];

                // Current value per ticker from transactions
                const currentValues: Record<string, number> = {};
                for (const tx of portTxs) {
                  if (!currentValues[tx.instrument_ticker]) currentValues[tx.instrument_ticker] = 0;
                  if (tx.type === "achat" || tx.type === "cotisation" || tx.type === "rééquilibrage") {
                    currentValues[tx.instrument_ticker] += tx.amount;
                  } else if (tx.type === "vente") {
                    currentValues[tx.instrument_ticker] -= tx.amount;
                  }
                }

                const rows = portfolio.allocations.map((alloc) => {
                  const targetValue = (alloc.weight / 100) * totalValue;
                  const currentValue = currentValues[alloc.instrument_ticker] || 0;
                  const delta = targetValue - currentValue;
                  const action: "ACHETER" | "VENDRE" | "ÉQUILIBRÉ" =
                    targetValue > 0 && Math.abs(delta) / targetValue < 0.02
                      ? "ÉQUILIBRÉ"
                      : delta > 0
                      ? "ACHETER"
                      : "VENDRE";
                  return {
                    ticker: alloc.instrument_ticker,
                    name: alloc.instrument_name,
                    suggestedAccount: alloc.suggested_account,
                    targetPct: alloc.weight,
                    targetValue,
                    currentValue,
                    delta,
                    action,
                  };
                });

                return (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                          <Scale className="h-5 w-5 text-primary" />
                          Rééquilibrage
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground shrink-0">Valeur totale</span>
                          <Input
                            type="number"
                            value={totalValue}
                            onChange={(e) =>
                              setTotalValueOverride((prev) => ({
                                ...prev,
                                [portfolio.id]: Number(e.target.value),
                              }))
                            }
                            className="h-8 w-36 text-sm"
                          />
                          <span className="text-sm text-muted-foreground">$</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Mobile cards */}
                      <div className="sm:hidden space-y-3">
                        {rows.map((row) => (
                          <div
                            key={row.ticker}
                            className={`rounded-lg border p-4 ${
                              row.action === "ACHETER"
                                ? "bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-900/50"
                                : row.action === "VENDRE"
                                ? "bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-medium text-sm">{row.name}</p>
                                <p className="text-xs text-muted-foreground">{row.ticker}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  row.action === "ACHETER"
                                    ? "border-green-300 text-green-700 dark:text-green-400"
                                    : row.action === "VENDRE"
                                    ? "border-red-300 text-red-600 dark:text-red-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {row.action}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Cible</span>
                                <p className="font-medium tabular-nums">
                                  {row.targetPct}% · {row.targetValue.toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Actuel</span>
                                <p className="font-medium tabular-nums">
                                  {row.currentValue.toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $
                                </p>
                              </div>
                            </div>
                            {row.action !== "ÉQUILIBRÉ" && (
                              <p className={`mt-2 text-sm font-semibold tabular-nums ${
                                row.action === "ACHETER" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}>
                                {row.action === "ACHETER" ? "+" : "-"}{Math.abs(row.delta).toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Desktop table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="pb-2 text-left font-medium">Instrument</th>
                              <th className="pb-2 text-center font-medium">Cible %</th>
                              <th className="pb-2 text-right font-medium">Cible $</th>
                              <th className="pb-2 text-right font-medium">Actuel $</th>
                              <th className="pb-2 text-center font-medium">Action</th>
                              <th className="pb-2 text-right font-medium">Montant $</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {rows.map((row) => (
                              <tr
                                key={row.ticker}
                                className={`${
                                  row.action === "ACHETER"
                                    ? "bg-green-50/50 dark:bg-green-950/20"
                                    : row.action === "VENDRE"
                                    ? "bg-red-50/50 dark:bg-red-950/20"
                                    : ""
                                }`}
                              >
                                <td className="py-2 pr-2">
                                  <p className="font-medium truncate max-w-[120px]">{row.name}</p>
                                  <p className="text-muted-foreground">{row.ticker}</p>
                                </td>
                                <td className="py-2 text-center">{row.targetPct}%</td>
                                <td className="py-2 text-right tabular-nums">
                                  {row.targetValue.toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {row.currentValue.toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $
                                </td>
                                <td className="py-2 text-center">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      row.action === "ACHETER"
                                        ? "border-green-300 text-green-700 dark:text-green-400"
                                        : row.action === "VENDRE"
                                        ? "border-red-300 text-red-600 dark:text-red-400"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {row.action}
                                  </Badge>
                                </td>
                                <td className={`py-2 text-right tabular-nums font-medium ${
                                  row.action === "ACHETER" ? "text-green-700 dark:text-green-400" :
                                  row.action === "VENDRE" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                                }`}>
                                  {row.action !== "ÉQUILIBRÉ"
                                    ? `${row.action === "ACHETER" ? "+" : "-"}${Math.abs(row.delta).toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $`
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        Les valeurs actuelles sont estimées à partir de vos transactions enregistrées.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => saveRebalancingTransactions(portfolio, rows)}
                        disabled={savingRebalance === portfolio.id}
                        className="gap-2"
                      >
                        {savingRebalance === portfolio.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        {savingRebalance === portfolio.id ? "Enregistrement..." : "Sauvegarder le rééquilibrage"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Projection */}
              <Card>
                <CardHeader>
                  <CardTitle>Projection de performance (20 ans)</CardTitle>
                  <CardDescription>
                    Basée sur un investissement initial de {initialInvestment.toLocaleString("fr-CA")} $ et
                    des contributions mensuelles de {monthlyContribution.toLocaleString("fr-CA")} $
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectionChart
                    initialInvestment={initialInvestment}
                    monthlyContribution={monthlyContribution}
                    expectedReturn={portfolio.expected_return || 5}
                    volatility={portfolio.volatility || 10}
                  />
                </CardContent>
              </Card>

              {/* Historical performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance historique estimée</CardTitle>
                  <CardDescription>
                    Évolution basée sur vos transactions réelles et le rendement attendu du portefeuille
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PerformanceChart
                    transactions={transactions[portfolio.id] || []}
                    expectedReturn={portfolio.expected_return || 5}
                  />
                </CardContent>
              </Card>

              {/* Rationale */}
              {portfolio.ai_rationale && (
                <Card>
                  <CardHeader>
                    <CardTitle>Justification de l&apos;IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {portfolio.ai_rationale}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Select button */}
              {!portfolio.is_selected && (
                <Button
                  onClick={() => selectPortfolio(portfolio.id)}
                  disabled={selecting}
                  className="w-full gap-2"
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4" />
                  Sélectionner ce portefeuille
                </Button>
              )}
            </TabsContent>
          );
        })}
      </Tabs>}
        </>
      )}
      <FloatingHelpButton question="Explique-moi les différences entre mes 3 portefeuilles et lequel choisir" />
    </div>
  );
}
