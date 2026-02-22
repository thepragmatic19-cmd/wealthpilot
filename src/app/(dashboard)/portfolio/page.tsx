"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { formatPercent, ASSET_CLASS_COLORS } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FINANCIAL_TERMS } from "@/lib/financial-terms";
import { toast } from "sonner";
import { CheckCircle, TrendingUp, Shield, BarChart3, Star, Info } from "lucide-react";
import { computeWeightedMer, computeAccountSummary } from "@/lib/portfolio/helpers";
import type { Portfolio, PortfolioAllocation, ClientInfo, Transaction } from "@/types/database";

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

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioWithAllocations[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: portfolioData }, { data: clientData }] = await Promise.all([
          supabase
            .from("portfolios")
            .select("*, portfolio_allocations(*)")
            .eq("user_id", user.id),
          supabase
            .from("client_info")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (portfolioData) {
          const mapped = portfolioData.map((p) => ({
            ...p,
            allocations: p.portfolio_allocations || [],
          })) as PortfolioWithAllocations[];
          setPortfolios(mapped);

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
        console.error("Portfolio load error:", err);
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

      setPortfolios((prev) =>
        prev.map((p) => ({ ...p, is_selected: p.id === portfolioId }))
      );
      toast.success("Portefeuille sélectionné");
    } catch (err) {
      console.error("Portfolio selection error:", err);
      toast.error("Erreur lors de la sélection du portefeuille");
    } finally {
      setSelecting(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vos portefeuilles recommandés</h1>
        <p className="text-muted-foreground">
          Comparez les 3 options et sélectionnez votre portefeuille idéal.
        </p>
      </div>

      {/* Risk/Return comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Comparaison risque/rendement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RiskReturnChart portfolios={riskReturnData} />
        </CardContent>
      </Card>

      {/* Portfolio tabs */}
      <Tabs defaultValue={selected?.type || "suggéré"}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conservateur" className="text-xs sm:text-sm">
            <Shield className="mr-1 sm:mr-2 h-4 w-4" />
            Conservateur
          </TabsTrigger>
          <TabsTrigger value="suggéré" className="gap-1 text-xs sm:text-sm">
            Suggéré <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          </TabsTrigger>
          <TabsTrigger value="ambitieux" className="text-xs sm:text-sm">
            <TrendingUp className="mr-1 sm:mr-2 h-4 w-4" />
            Ambitieux
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{portfolio.name}</CardTitle>
                      <CardDescription>{portfolio.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {portfolio.is_selected && (
                        <Badge className="gap-1" variant="default">
                          <CheckCircle className="h-3 w-3" />
                          Sélectionné
                        </Badge>
                      )}
                      <ExportPdfButton portfolio={portfolio} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-lg border p-3 text-center">
                      <MetricLabel label="Rendement attendu" />
                      <p className="text-xl font-bold text-green-600 sm:text-2xl">
                        {formatPercent(portfolio.expected_return || 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <MetricLabel label="Volatilité" />
                      <p className="text-xl font-bold text-orange-500 sm:text-2xl">
                        {formatPercent(portfolio.volatility || 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <MetricLabel label="Ratio de Sharpe" />
                      <p className="text-xl font-bold sm:text-2xl">{portfolio.sharpe_ratio?.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <MetricLabel label="Perte max. historique" />
                      <p className="text-xl font-bold text-red-500 sm:text-2xl">
                        -{formatPercent(Math.abs(portfolio.max_drawdown || 0))}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <MetricLabel label="RFG moyen pondéré" />
                      <p className="text-xl font-bold sm:text-2xl">
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
              <div className="grid gap-6 lg:grid-cols-2">
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
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor:
                                  ASSET_CLASS_COLORS[alloc.asset_class] || "#6b7280",
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium">{alloc.instrument_name}</p>
                                {alloc.currency === 'USD' && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">USD</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {alloc.instrument_ticker} • {alloc.asset_class}
                                {alloc.mer != null && ` • RFG ${alloc.mer}%`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {alloc.suggested_account && ACCOUNT_LABELS[alloc.suggested_account] && (
                              <Badge
                                variant={ACCOUNT_LABELS[alloc.suggested_account].variant}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {ACCOUNT_LABELS[alloc.suggested_account].label}
                              </Badge>
                            )}
                            <div className="text-right">
                              <Badge variant="outline">{alloc.weight}%</Badge>
                              {alloc.expected_return && (
                                <p className="text-xs text-green-600">
                                  +{alloc.expected_return}%/an
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

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
      </Tabs>
    </div>
  );
}
