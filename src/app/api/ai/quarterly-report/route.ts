import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { getQuarterlyNarrativePrompt } from "@/lib/ai/prompts";
import { canAccess } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/types/database";

const REER_MAX = 32490;
const CELI_CUMULATIVE_LIMIT = 109000;



export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Check subscription
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const userPlan = (subscriptionData?.plan || "free") as SubscriptionPlan;
    if (!canAccess(userPlan, "pdf_export")) {
      return NextResponse.json(
        { error: "Rapport trimestriel disponible avec Pro ou Élite.", upgradeRequired: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { portfolioId } = body;

    // Fetch all data in parallel
    const [
      { data: clientInfo },
      { data: goals },
      { data: portfolio },
      { data: snapshots },
    ] = await Promise.all([
      supabase.from("client_info").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase
        .from("portfolios")
        .select("*, portfolio_allocations(*)")
        .eq("user_id", user.id)
        .eq("id", portfolioId)
        .maybeSingle(),
      supabase
        .from("net_worth_snapshots")
        .select("snapshot_date, total_assets, total_debts, net_worth")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: true })
        .limit(12),
    ]);

    // Net worth computations
    const snapshotList = snapshots || [];
    const currentNW = snapshotList.length > 0
      ? Number(snapshotList[snapshotList.length - 1].net_worth || 0)
      : Number(clientInfo?.total_assets || 0) - Number(clientInfo?.total_debts || 0);

    const threeMonthsAgo =
      snapshotList.length >= 4
        ? Number(snapshotList[snapshotList.length - 4].net_worth || 0)
        : snapshotList.length >= 2
          ? Number(snapshotList[0].net_worth || 0)
          : null;

    const oneYearAgo =
      snapshotList.length >= 12
        ? Number(snapshotList[snapshotList.length - 12].net_worth || 0)
        : snapshotList.length >= 2
          ? Number(snapshotList[0].net_worth || 0)
          : null;

    // Fetch benchmark returns for portfolio attribution
    let benchmarkData = "";
    try {
      const benchmarkSymbols = "^GSPTSE,^GSPC";
      const bUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(benchmarkSymbols)}&fields=regularMarketPrice,regularMarketChangePercent,shortName`;
      const bRes = await fetch(bUrl, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } });
      if (bRes.ok) {
        const bData = await bRes.json();
        const quotes = (bData.quoteResponse?.result || []);
        const tsx = quotes.find((q: any) => q.symbol === "^GSPTSE");
        const sp500 = quotes.find((q: any) => q.symbol === "^GSPC");
        if (tsx) benchmarkData += `S&P/TSX Composite: ${tsx.regularMarketChangePercent >= 0 ? '+' : ''}${tsx.regularMarketChangePercent?.toFixed(2)}% (séance)`;
        if (sp500) benchmarkData += ` | S&P 500: ${sp500.regularMarketChangePercent >= 0 ? '+' : ''}${sp500.regularMarketChangePercent?.toFixed(2)}% (séance)`;
      }
    } catch {
      // Benchmark data unavailable — continue without
    }

    // Fiscal computations
    const annualIncome = Number(clientInfo?.annual_income || 0);
    const celiBalance = Number(clientInfo?.celi_balance || 0);
    const reerBalance = Number(clientInfo?.reer_balance || 0);
    const reerLimit = Math.min(annualIncome * 0.18, REER_MAX);
    const reerRoom = Math.max(0, reerLimit - reerBalance);
    const celiRoom = Math.max(0, CELI_CUMULATIVE_LIMIT - celiBalance);

    // Rough federal+provincial marginal rate estimate
    const federalRate = annualIncome > 235675 ? 0.33 : annualIncome > 165430 ? 0.29 : annualIncome > 111733 ? 0.26 : annualIncome > 55867 ? 0.205 : 0.15;
    const reerTaxSaving = Math.round(reerRoom * (federalRate + 0.15)); // approx combined

    const reportData = {
      netWorth: {
        current: currentNW,
        threeMonthsAgo,
        oneYearAgo,
        snapshots: snapshotList,
      },
      portfolioData: {
        name: portfolio?.name || "—",
        type: portfolio?.type || "—",
        expected_return: portfolio?.expected_return ?? null,
        volatility: portfolio?.volatility ?? null,
        sharpe_ratio: portfolio?.sharpe_ratio ?? null,
        total_mer: portfolio?.total_mer ?? null,
      },
      goals: (goals || []).map((g) => ({
        label: g.label,
        type: g.type,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount),
        target_date: g.target_date,
      })),
      fiscalData: {
        celiRoom,
        reerRoom,
        reerTaxSaving,
      },
    };

    // Build narrative context
    const var3m = threeMonthsAgo && threeMonthsAgo > 0
      ? `${((currentNW - threeMonthsAgo) / threeMonthsAgo * 100).toFixed(1)}%`
      : "N/A";

    const goalsStr = (goals || [])
      .map((g) => {
        const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
        return `- ${g.label}: ${pct}% (${g.current_amount.toLocaleString("fr-CA")}$ / ${g.target_amount.toLocaleString("fr-CA")}$)`;
      })
      .join("\n") || "Aucun objectif défini";

    const context = `
## Client
- Valeur nette actuelle: ${currentNW.toLocaleString("fr-CA")}$
- Variation 3 mois: ${var3m}${oneYearAgo && oneYearAgo > 0 ? ` | Variation 12 mois: ${(((currentNW - oneYearAgo) / oneYearAgo) * 100).toFixed(1)}%` : ''}
- Revenu annuel: ${annualIncome.toLocaleString("fr-CA")}$

## Portefeuille (${portfolio?.type || "non sélectionné"})
- Rendement attendu: ${portfolio?.expected_return ?? "—"}%
- Volatilité: ${portfolio?.volatility ?? "—"}%
- Sharpe: ${portfolio?.sharpe_ratio?.toFixed(2) ?? "—"}
- MER total: ${portfolio?.total_mer?.toFixed(2) ?? "—"}%

## Benchmarks du trimestre
${benchmarkData || "Données non disponibles"}

## Objectifs
${goalsStr}

## Fiscal
- Espace CELI disponible: ${celiRoom.toLocaleString("fr-CA")}$
- Espace REER disponible: ${reerRoom.toLocaleString("fr-CA")}$
- Économie fiscale potentielle REER: ${reerTaxSaving.toLocaleString("fr-CA")}$

## Trimestre
${new Date().toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}`;

    // Generate AI narrative using CFA-grade quarterly prompt
    let narrative = "";
    try {
      const aiResponse = await generateAIResponse({
        systemPrompt: getQuarterlyNarrativePrompt(),
        userMessage: context,
        maxTokens: 1200,
        temperature: 0.55,
      });
      narrative = aiResponse.text || "";
    } catch {
      narrative = `Bilan ${new Date().toLocaleDateString("fr-CA", { month: "long", year: "numeric" })} — Valeur nette : ${currentNW.toLocaleString("fr-CA")}$. Votre portefeuille ${portfolio?.type || ""} est bien positionné. Priorité : maximiser vos comptes enregistrés et réviser vos objectifs avec votre conseiller WealthPilot.\n\nCordialement, Alexandre Moreau, CFA, CIWM — WealthPilot`;
    }

    return NextResponse.json({ narrative, data: reportData });
  } catch (err) {
    console.error("Quarterly report API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
