"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { formatPercent } from "@/lib/utils";
import { FINANCIAL_TERMS } from "@/lib/financial-terms";
import { ArrowRight, Loader2, PieChart, Sparkles, CheckCircle, Star, Info, RefreshCw } from "lucide-react";
import type { Portfolio, PortfolioAllocation } from "@/types/database";

interface Props {
  userId: string;
}

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
  if (!tooltip) return <p className="text-xs text-muted-foreground">{label}</p>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1 cursor-help">
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

export function PortfolioPreviewStep({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioWithAllocations[]>([]);
  const [selecting, setSelecting] = useState(false);
  const generatingRef = useRef(false);
  const router = useRouter();

  const loadOrGenerate = useCallback(async () => {
    const supabase = createClient();

    // Check if portfolios already exist
    const { data: existing } = await supabase
      .from("portfolios")
      .select("*, portfolio_allocations(*)")
      .eq("user_id", userId);

    if (existing && existing.length > 0) {
      const mapped = existing.map((p) => ({
        ...p,
        allocations: p.portfolio_allocations || [],
      })) as PortfolioWithAllocations[];
      setPortfolios(mapped);
      setLoading(false);
      return;
    }

    // Prevent double generation from StrictMode
    if (generatingRef.current) return;
    generatingRef.current = true;

    // Generate portfolios
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Portfolio API error:", res.status, errorBody);
        throw new Error(`API error ${res.status}`);
      }

      const data = await res.json();

      if (data.portfolios && data.portfolios.length > 0) {
        setPortfolios(data.portfolios);
        setLoading(false);
        setGenerating(false);
        generatingRef.current = false;
        return;
      }

      // Fallback: Reload from DB if API didn't return directly
      const { data: newPortfolios } = await supabase
        .from("portfolios")
        .select("*, portfolio_allocations(*)")
        .eq("user_id", userId);

      if (newPortfolios) {
        const mapped = newPortfolios.map((p) => ({
          ...p,
          allocations: p.portfolio_allocations || [],
        })) as PortfolioWithAllocations[];
        setPortfolios(mapped);
      }
    } catch (err) {
      console.error("Portfolio generation failed:", err);
      toast.error("Erreur lors de la génération des portefeuilles");
    }
    generatingRef.current = false;
    setGenerating(false);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadOrGenerate();
  }, [userId, loadOrGenerate]);

  async function selectPortfolio(portfolioId: string, portfolioType: string) {
    setSelecting(true);
    try {
      const supabase = createClient();

      let targetId = portfolioId;

      // If ID is missing or temporary, we need to find the real one in DB
      // Portfolios were saved during the POST /api/ai/portfolio call
      if (!targetId || targetId === "" || targetId.length < 10) {
        const { data: dbPortfolios } = await supabase
          .from("portfolios")
          .select("id")
          .eq("user_id", userId)
          .eq("type", portfolioType)
          .single();

        if (dbPortfolios) {
          targetId = dbPortfolios.id;
        } else {
          throw new Error("Portfolio not found in database");
        }
      }

      // Deselect all
      await supabase
        .from("portfolios")
        .update({ is_selected: false })
        .eq("user_id", userId);

      // Select this one
      const { error: selectError } = await supabase
        .from("portfolios")
        .update({ is_selected: true })
        .eq("id", targetId);

      if (selectError) throw selectError;

      // Mark onboarding as completed
      await supabase
        .from("profiles")
        .update({ onboarding_step: "completed", onboarding_completed: true })
        .eq("id", userId);

      toast.success("Portefeuille sélectionné! Bienvenue sur WealthPilot.");
      router.push("/dashboard");
    } catch (err) {
      console.error("Selection error:", err);
      toast.error("Erreur lors de la sélection du portefeuille");
    } finally {
      setSelecting(false);
    }
  }

  if (loading || generating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <PieChart className="h-12 w-12 text-primary animate-pulse" />
            <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-yellow-500 animate-bounce" />
          </div>
          <p className="text-muted-foreground text-center">
            {generating
              ? "Notre IA génère 3 portefeuilles personnalisés avec des ETFs réels..."
              : "Chargement de vos portefeuilles..."}
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (portfolios.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <PieChart className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Erreur de génération</h2>
          <p className="text-muted-foreground">
            La génération des portefeuilles a échoué. Veuillez réessayer.
          </p>
          <Button onClick={() => {
            setLoading(true);
            loadOrGenerate();
          }} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const typeOrder = ["conservateur", "suggéré", "ambitieux"];
  const sorted = [...portfolios].sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Vos portefeuilles recommandés</CardTitle>
        <CardDescription>
          3 propositions adaptées à votre profil. Sélectionnez celui qui vous convient.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="suggéré" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conservateur">Conservateur</TabsTrigger>
            <TabsTrigger value="suggéré" className="gap-1">
              Suggéré <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
            </TabsTrigger>
            <TabsTrigger value="ambitieux">Ambitieux</TabsTrigger>
          </TabsList>

          {sorted.map((portfolio) => {
            const avgMer = computeWeightedMer(portfolio.allocations);

            return (
              <TabsContent key={portfolio.type} value={portfolio.type} className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{portfolio.name}</h3>
                    <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                  </div>
                  {portfolio.type === "suggéré" && (
                    <Badge>Recommandé</Badge>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border p-3 text-center">
                    <MetricLabel label="Rendement attendu" />
                    <p className="text-lg font-bold text-green-600">
                      {formatPercent(portfolio.expected_return || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <MetricLabel label="Volatilité" />
                    <p className="text-lg font-bold text-orange-500">
                      {formatPercent(portfolio.volatility || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <MetricLabel label="Ratio de Sharpe" />
                    <p className="text-lg font-bold">{portfolio.sharpe_ratio?.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <MetricLabel label="RFG moyen" />
                    <p className="text-lg font-bold">
                      {portfolio.total_mer !== null ? `${portfolio.total_mer}%` : (avgMer !== null ? `${avgMer}%` : '—')}
                    </p>
                  </div>
                </div>

                {/* Strategic Insights - Premium Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portfolio.stress_test && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-yellow-700 font-semibold text-sm">
                        <Sparkles className="h-4 w-4" />
                        Analyse de Résilience (Stress Test)
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-yellow-100 pb-1">
                          <span className="text-muted-foreground">Choc Inflation (+5%)</span>
                          <span className="font-medium">{portfolio.stress_test.inflation_shock}</span>
                        </div>
                        <div className="flex justify-between border-b border-yellow-100 pb-1">
                          <span className="text-muted-foreground">Krach Boursier (-30%)</span>
                          <span className="font-medium text-red-600">{portfolio.stress_test.market_crash}</span>
                        </div>
                        <div className="flex justify-between border-b border-yellow-100 pb-1">
                          <span className="text-muted-foreground">Hausse des Taux</span>
                          <span className="font-medium">{portfolio.stress_test.interest_rate_hike}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {portfolio.tax_strategy && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Optimisation Fiscale
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {portfolio.tax_strategy}
                      </p>
                    </div>
                  )}
                </div>

                {/* Allocations */}
                <div className="space-y-2">
                  <h4 className="font-medium">Allocations</h4>
                  {portfolio.allocations.map((alloc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{alloc.instrument_name}</p>
                          {alloc.currency === 'USD' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">USD</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {alloc.instrument_ticker} • {alloc.asset_class}
                            {alloc.mer != null && ` • RFG ${alloc.mer}%`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {alloc.suggested_account && ACCOUNT_LABELS[alloc.suggested_account] && (
                          <Badge
                            variant={ACCOUNT_LABELS[alloc.suggested_account].variant}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {ACCOUNT_LABELS[alloc.suggested_account].label}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {alloc.weight}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rationale */}
                {portfolio.ai_rationale && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">{portfolio.ai_rationale}</p>
                  </div>
                )}

                <Button
                  onClick={() => selectPortfolio(portfolio.id, portfolio.type)}
                  disabled={selecting}
                  className="w-full gap-2"
                  size="lg"
                >
                  {selecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Sélectionner ce portefeuille
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function computeWeightedMer(allocations: PortfolioAllocation[]): string | null {
  let totalWeight = 0;
  let weightedMer = 0;
  for (const alloc of allocations) {
    if (alloc.mer != null) {
      weightedMer += alloc.weight * alloc.mer;
      totalWeight += alloc.weight;
    }
  }
  if (totalWeight === 0) return null;
  return (weightedMer / totalWeight).toFixed(2);
}
