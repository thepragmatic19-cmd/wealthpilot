import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { canAccess } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/types/database";

const INSIGHT_SYSTEM_PROMPT = `Tu es l'IA proactive de WealthPilot. Tu analyses la situation financière d'un client canadien et génères des insights personnalisés et actionnables.

## Ton rôle
Produire 2-3 insights courts et percutants qui aident le client à :
1. Optimiser sa fiscalité (CELI, REER, REEE)
2. Atteindre ses objectifs plus rapidement
3. Améliorer la santé de son portefeuille
4. Réagir aux conditions de marché actuelles

## Règles
- Chaque insight doit être CONCIS (2-3 phrases max)
- Être SPÉCIFIQUE au client (utilise ses chiffres réels)
- Toujours en français
- Proposer une ACTION concrète
- Ne PAS recommander de titres individuels

## Format JSON strict
{
  "insights": [
    {
      "type": "tax_optimization|portfolio_alert|goal_progress|rebalancing|market_update|general_tip",
      "title": "Titre court et accrocheur (max 60 caractères)",
      "content": "Explication avec chiffres concrets et action recommandée (max 200 caractères)",
      "priority": "low|normal|high|urgent"
    }
  ]
}

Réponds UNIQUEMENT avec le JSON.`;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Rate limiting: 2 requests per minute
        const rateLimit = await checkRateLimit(`insights:${user.id}`, 2);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetInSeconds);
        }

        // Check subscription plan
        const { data: subscriptionData } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("user_id", user.id)
            .single();

        const userPlan = (subscriptionData?.plan || "free") as SubscriptionPlan;
        if (!canAccess(userPlan, "ai_insights")) {
            return NextResponse.json(
                { error: "Cette fonctionnalité nécessite un abonnement Pro ou Élite.", upgradeRequired: true },
                { status: 403 }
            );
        }

        // Check if we already generated insights recently (within 24h)
        const { data: recentInsights } = await supabase
            .from("ai_insights")
            .select("id")
            .eq("user_id", user.id)
            .gte(
                "created_at",
                new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            )
            .limit(1);

        // Accept force parameter to override the 24h check
        let forceGenerate = false;
        try {
            const body = await request.json();
            forceGenerate = body?.force === true;
        } catch {
            // No body or invalid — that's fine
        }

        if (recentInsights && recentInsights.length > 0 && !forceGenerate) {
            return NextResponse.json({
                message: "Des insights ont déjà été générés dans les dernières 24h.",
                skipped: true,
            });
        }

        // Fetch all user context
        const [
            { data: clientInfo },
            { data: goals },
            { data: riskAssessment },
            { data: selectedPortfolio },
        ] = await Promise.all([
            supabase
                .from("client_info")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle(),
            supabase.from("goals").select("*").eq("user_id", user.id),
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
        ]);

        // Fetch live market data
        let marketSummary = "";
        try {
            const baseUrl =
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
            const marketRes = await fetch(`${baseUrl}/api/market/quotes`);
            if (marketRes.ok) {
                const marketData = await marketRes.json();
                marketSummary = (marketData.quotes || [])
                    .map(
                        (q: { name: string; price: number; changePercent: number }) =>
                            `${q.name}: ${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`
                    )
                    .join(", ");
            }
        } catch {
            // Market data unavailable
        }

        // Build user context for AI
        const userContext = `
## Client
- Âge: ${clientInfo?.age || "N/A"}
- Revenu annuel: ${clientInfo?.annual_income || "N/A"}$
- Épargne mensuelle: ${clientInfo?.monthly_savings || "N/A"}$
- CELI: ${clientInfo?.has_celi ? `${clientInfo.celi_balance}$` : "Non ouvert"}
- REER: ${clientInfo?.has_reer ? `${clientInfo.reer_balance}$` : "Non ouvert"}
- REEE: ${clientInfo?.has_reee ? `${clientInfo.reee_balance}$` : "Non ouvert"}
- Profil de risque: ${riskAssessment?.risk_profile || "Non évalué"} (${riskAssessment?.risk_score || "?"}/10)

## Portefeuille
${selectedPortfolio
                ? `- Type: ${selectedPortfolio.type}
- Rendement attendu: ${selectedPortfolio.expected_return}%
- Volatilité: ${selectedPortfolio.volatility}%
- Sharpe: ${selectedPortfolio.sharpe_ratio}`
                : "Aucun portefeuille sélectionné"
            }

## Objectifs
${goals && goals.length > 0
                ? goals
                    .map(
                        (g: { label: string; type: string; target_amount: number; current_amount: number }) =>
                            `- ${g.label} (${g.type}): ${g.current_amount}$ / ${g.target_amount}$ (${Math.round((g.current_amount / g.target_amount) * 100)}%)`
                    )
                    .join("\n")
                : "Aucun objectif défini"
            }

## Marché aujourd'hui
${marketSummary || "Données non disponibles"}

## Date
${new Date().toLocaleDateString("fr-CA", { dateStyle: "long" })}

Génère 2-3 insights personnalisés pour ce client.`;

        let insights;
        try {
            const aiResponse = await generateAIResponse({
                systemPrompt: INSIGHT_SYSTEM_PROMPT,
                userMessage: userContext,
                maxTokens: 1024,
            });

            const text = aiResponse.text;
            if (!text) throw new Error("No text from AI");
            // Clean potential markdown code fences from response
            const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            insights = JSON.parse(cleanedText);
        } catch (aiError) {
            console.error("AI Error in Insights (using fallback):", aiError);
            // Generate deterministic fallback insights
            insights = generateFallbackInsights(clientInfo, goals, selectedPortfolio);
        }

        // Save insights to database
        const insightsToSave = (insights.insights || []).map(
            (insight: {
                type: string;
                title: string;
                content: string;
                priority: string;
            }) => ({
                user_id: user.id,
                type: insight.type,
                title: insight.title,
                content: insight.content,
                priority: insight.priority || "normal",
                expires_at: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                ).toISOString(), // 7 days
            })
        );

        if (insightsToSave.length > 0) {
            const { error: insertError } = await supabase
                .from("ai_insights")
                .insert(insightsToSave);

            if (insertError) {
                console.error("Error saving insights:", insertError);
            }
        }

        return NextResponse.json({
            insights: insights.insights || [],
            generated_at: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Insights API error:", error);
        return NextResponse.json(
            { error: "Erreur lors de la génération des insights" },
            { status: 500 }
        );
    }
}

// Fallback insights when AI is unavailable
function generateFallbackInsights(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientInfo: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    goals: any[] | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    portfolio: any
) {
    const insights = [];

    // CELI/REER tip
    if (clientInfo) {
        const celiBalance = Number(clientInfo.celi_balance || 0);
        const reerBalance = Number(clientInfo.reer_balance || 0);

        if (celiBalance < 95000) {
            const room = 95000 - celiBalance;
            insights.push({
                type: "tax_optimization",
                title: `${room.toLocaleString("fr-CA")}$ d'espace CELI disponible`,
                content: `Maximisez votre CELI pour faire croître vos placements à l'abri de l'impôt. Cotisation annuelle max: 7 000$ (2024).`,
                priority: room > 50000 ? "high" : "normal",
            });
        }

        if (clientInfo.annual_income && reerBalance < clientInfo.annual_income * 0.18) {
            insights.push({
                type: "tax_optimization",
                title: "Optimisez votre déduction REER",
                content: `Une cotisation REER pourrait réduire votre impôt de ${Math.round(clientInfo.annual_income * 0.18 * 0.3).toLocaleString("fr-CA")}$ cette année.`,
                priority: "normal",
            });
        }
    }

    // Goal progress
    if (goals && goals.length > 0) {
        const bestGoal = goals.reduce((best, g) => {
            const progress =
                g.target_amount > 0 ? g.current_amount / g.target_amount : 0;
            const bestProgress =
                best.target_amount > 0 ? best.current_amount / best.target_amount : 0;
            return progress > bestProgress ? g : best;
        });
        const progress = Math.round(
            (bestGoal.current_amount / bestGoal.target_amount) * 100
        );
        if (progress >= 75) {
            insights.push({
                type: "goal_progress",
                title: `🎯 ${bestGoal.label}: ${progress}% atteint!`,
                content: `Vous approchez de votre objectif. Envisagez de sécuriser vos gains avec une allocation plus conservatrice.`,
                priority: "high",
            });
        }
    }

    // Portfolio check
    if (portfolio) {
        insights.push({
            type: "general_tip",
            title: "Revue trimestrielle recommandée",
            content: `Votre portefeuille ${portfolio.type} vise ${portfolio.expected_return}% de rendement. Vérifiez que votre allocation reste alignée avec vos objectifs.`,
            priority: "low",
        });
    }

    if (insights.length === 0) {
        insights.push({
            type: "general_tip",
            title: "Complétez votre profil WealthPilot",
            content: "Ajoutez vos informations financières pour recevoir des insights personnalisés chaque semaine.",
            priority: "normal",
        });
    }

    return { insights };
}
