import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { getInsightSystemPrompt } from "@/lib/ai/prompts";
import { detectClientMilestones } from "@/lib/ai/persona";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { canAccess } from "@/lib/subscription";
import { logger } from "@/lib/logger";
import type { SubscriptionPlan } from "@/types/database";




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

        // Build enriched user context
        const income = Number(clientInfo?.annual_income || 0);
        const monthlyIncome = income / 12;
        const monthlySavings = Number(clientInfo?.monthly_savings || 0);
        const monthlyExpenses = Number(clientInfo?.monthly_expenses || 0);
        const totalAssets = Number(clientInfo?.total_assets || 0);
        const totalDebts = Number(clientInfo?.total_debts || 0);
        const celiBalance = Number(clientInfo?.celi_balance || 0);
        const reerBalance = Number(clientInfo?.reer_balance || 0);
        const age = Number(clientInfo?.age || 0);

        const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : null;
        const debtRatio = totalAssets > 0 ? Math.round((totalDebts / totalAssets) * 100) : null;
        const netWorth = totalAssets - totalDebts;
        const reerAnnualRoom = income > 0 ? Math.min(Math.round(income * 0.18), 31560) : null;
        // CELI cumulative room: $6,500/yr × years since 18 (simplified estimate)
        const celiCumulativeRoom = age >= 18 ? Math.min((age - 17) * 6500, 95000) : null;
        const celiRoom = celiCumulativeRoom !== null ? Math.max(0, celiCumulativeRoom - celiBalance) : null;
        const emergencyFundTarget = monthlyExpenses > 0 ? monthlyExpenses * 3 : null;

        // Portfolio allocations summary
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allocations = (selectedPortfolio as any)?.portfolio_allocations || [];
        const allocSummary = allocations.length > 0
            ? allocations
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .sort((a: any, b: any) => b.weight - a.weight)
                .slice(0, 4)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((a: any) => `${a.asset_class} ${a.weight}%`)
                .join(", ")
            : null;

        // Goals with urgency
        const now = new Date();
        const goalsWithUrgency = (goals || []).map((g: { label: string; type: string; target_amount: number; current_amount: number; target_date?: string }) => {
            const progress = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            const gap = g.target_amount - g.current_amount;
            let urgencyNote = "";
            if (g.target_date) {
                const daysLeft = Math.round((new Date(g.target_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysLeft < 180) urgencyNote = ` ⚠️ URGENT (${daysLeft}j restants)`;
                else if (daysLeft < 365) urgencyNote = ` (${Math.round(daysLeft / 30)} mois restants)`;
                else urgencyNote = ` (dans ${Math.round(daysLeft / 365)} ans)`;
            }
            return `- ${g.label}: ${g.current_amount.toLocaleString("fr-CA")}$ / ${g.target_amount.toLocaleString("fr-CA")}$ (${progress}%, manque ${gap.toLocaleString("fr-CA")}$)${urgencyNote}`;
        });

        const userContext = `
## Profil client
- Âge: ${age || "N/A"} ans
- Revenu annuel: ${income > 0 ? `${income.toLocaleString("fr-CA")}$` : "N/A"}
- Revenu mensuel: ${monthlyIncome > 0 ? `${Math.round(monthlyIncome).toLocaleString("fr-CA")}$` : "N/A"}
- Épargne mensuelle: ${monthlySavings > 0 ? `${monthlySavings.toLocaleString("fr-CA")}$` : "N/A"}${savingsRate !== null ? ` (taux: ${savingsRate}% — sain si > 20%)` : ""}
- Dépenses mensuelles: ${monthlyExpenses > 0 ? `${monthlyExpenses.toLocaleString("fr-CA")}$` : "N/A"}
- Actifs totaux: ${totalAssets > 0 ? `${totalAssets.toLocaleString("fr-CA")}$` : "N/A"}
- Dettes totales: ${totalDebts > 0 ? `${totalDebts.toLocaleString("fr-CA")}$` : "0$"}
- Valeur nette: ${netWorth > 0 ? `${netWorth.toLocaleString("fr-CA")}$` : "N/A"}${debtRatio !== null ? ` | Ratio dette/actif: ${debtRatio}% (risqué si > 35%)` : ""}
- Fonds d'urgence cible: ${emergencyFundTarget ? `${emergencyFundTarget.toLocaleString("fr-CA")}$ (3 mois de dépenses)` : "N/A"}
- Profil de risque: ${riskAssessment?.risk_profile || "Non évalué"} (${riskAssessment?.risk_score || "?"}/10)

## Comptes enregistrés
- CELI: ${clientInfo?.has_celi ? `${celiBalance.toLocaleString("fr-CA")}$${celiRoom !== null ? ` | espace disponible estimé: ${celiRoom.toLocaleString("fr-CA")}$` : ""}` : "Non ouvert"}
- REER: ${clientInfo?.has_reer ? `${reerBalance.toLocaleString("fr-CA")}$${reerAnnualRoom !== null ? ` | déduction max annuelle: ${reerAnnualRoom.toLocaleString("fr-CA")}$` : ""}` : "Non ouvert"}
- REEE: ${clientInfo?.has_reee ? `${Number(clientInfo.reee_balance || 0).toLocaleString("fr-CA")}$` : "Non ouvert"}

## Portefeuille sélectionné
${selectedPortfolio
                ? `- Type: ${selectedPortfolio.type} | Rendement attendu: ${selectedPortfolio.expected_return}% | Volatilité: ${selectedPortfolio.volatility}% | Sharpe: ${selectedPortfolio.sharpe_ratio}${allocSummary ? `\n- Allocation: ${allocSummary}` : ""}`
                : "Aucun portefeuille sélectionné"
            }

## Objectifs (triés par urgence)
${goalsWithUrgency.length > 0 ? goalsWithUrgency.join("\n") : "Aucun objectif défini"}

## Marché aujourd'hui
${marketSummary || "Données non disponibles"}

## Date
${new Date().toLocaleDateString("fr-CA", { dateStyle: "long" })}

Génère 3-4 insights personnalisés pour ce client, triés du plus urgent au moins urgent.`;

        let insights;
        try {
            // Detect milestones to prepend milestone-triggered insights
            const milestones = detectClientMilestones({
                age: age || null,
                annualIncome: income || null,
                monthlySavings: monthlySavings || null,
                monthlyExpenses: monthlyExpenses || null,
                totalAssets: totalAssets || null,
                totalDebts: totalDebts || null,
                celiBalance: celiBalance || null,
                reerBalance: reerBalance || null,
                hasDependents: !!(clientInfo?.dependents && Number(clientInfo.dependents) > 0),
                hasReee: !!(clientInfo?.has_reee),
                riskScore: riskAssessment?.risk_score || 5,
                goals: (goals || []).map((g: { label: string; target_amount: number; current_amount: number; target_date?: string }) => ({
                    label: g.label,
                    targetAmount: g.target_amount,
                    currentAmount: g.current_amount,
                    targetDate: g.target_date || null,
                })),
            });

            // Generate AI insights with CFA-grade system prompt
            const aiResponse = await generateAIResponse({
                systemPrompt: getInsightSystemPrompt(),
                userMessage: userContext,
                maxTokens: 1200,
                temperature: 0.3, // Lower temperature for consistent, authoritative CFA output
            });

            const text = aiResponse.text;
            if (!text) throw new Error("No text from AI");
            // Clean potential markdown code fences from response
            const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            insights = JSON.parse(cleanedText);

            // Prepend high-urgency milestone insights (max 2) not already covered by AI
            const milestoneInsights = milestones
                .filter(m => m.urgency === 'urgent' || m.urgency === 'high')
                .slice(0, 2)
                .map(m => ({
                    type: "milestone_alert",
                    urgency_level: m.urgency === 'urgent' ? 'critique' : 'important',
                    title: m.label.slice(0, 60),
                    content: m.actionPrompt.slice(0, 220),
                    priority: m.urgency,
                    cfa_rationale: "Jalon financier critique détecté par le moteur de segmentation client CFA.",
                    action_url: "/chat",
                }));

            if (milestoneInsights.length > 0) {
                insights.insights = [...milestoneInsights, ...(insights.insights || [])];
            }
        } catch (aiError) {
            logger.error("AI Error in Insights (using fallback):", aiError);
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
                logger.error("Error saving insights:", insertError);
            }
        }

        return NextResponse.json({
            insights: insights.insights || [],
            generated_at: new Date().toISOString(),
        });
    } catch (error) {
        logger.error("Insights API error:", error);
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
