import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { canAccess } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/types/database";

const REER_MAX = 32490;
const CELI_CUMULATIVE_LIMIT = 109000;

const NARRATIVE_PROMPT = `Tu es le conseiller financier IA de WealthPilot. Génère un bilan trimestriel personnalisé (~200 mots) en français canadien pour ce client.

Ton bilan doit :
1. Commenter l'évolution de la valeur nette (positif ou domaines à améliorer)
2. Évaluer la progression vers les objectifs de vie
3. Souligner une ou deux optimisations fiscales concrètes (CELI/REER)
4. Donner un regard constructif et motivant sur la stratégie de portefeuille
5. Conclure avec une priorité claire pour le prochain trimestre

Ton ton : professionnel, chiffré, encourageant. Utilise les vrais chiffres du client.`;

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
- Variation 3 mois: ${var3m}
- Revenu annuel: ${annualIncome.toLocaleString("fr-CA")}$

## Portefeuille (${portfolio?.type || "non sélectionné"})
- Rendement attendu: ${portfolio?.expected_return ?? "—"}%
- Volatilité: ${portfolio?.volatility ?? "—"}%
- Sharpe: ${portfolio?.sharpe_ratio?.toFixed(2) ?? "—"}

## Objectifs
${goalsStr}

## Fiscal
- Espace CELI disponible: ${celiRoom.toLocaleString("fr-CA")}$
- Espace REER disponible: ${reerRoom.toLocaleString("fr-CA")}$
- Économie fiscale potentielle REER: ${reerTaxSaving.toLocaleString("fr-CA")}$

## Trimestre
${new Date().toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}`;

    // Generate AI narrative
    let narrative = "";
    try {
      const aiResponse = await generateAIResponse({
        systemPrompt: NARRATIVE_PROMPT,
        userMessage: context,
        maxTokens: 512,
        temperature: 0.6,
      });
      narrative = aiResponse.text || "";
    } catch {
      narrative = `Bilan ${new Date().toLocaleDateString("fr-CA", { month: "long", year: "numeric" })} — Votre patrimoine s'élève à ${currentNW.toLocaleString("fr-CA")}$. Continuez à cotiser régulièrement à vos comptes enregistrés pour optimiser votre situation fiscale. Votre portefeuille ${portfolio?.type || ""} reste bien positionné pour atteindre vos objectifs à long terme.`;
    }

    return NextResponse.json({ narrative, data: reportData });
  } catch (err) {
    console.error("Quarterly report API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
