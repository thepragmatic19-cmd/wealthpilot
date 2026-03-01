import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatWithTools } from "@/lib/ai/client";
import { getChatSystemPrompt } from "@/lib/ai/prompts";
import { AI_TOOLS, executeTool } from "@/lib/ai/tools";
import { buildClientPersonaContext, detectClientMilestones } from "@/lib/ai/persona";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getChatLimit } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/types/database";

const chatBodySchema = z.object({
  message: z.string().min(1, "Message vide").max(5000, "Message trop long"),
});

// Fetch live market data for AI context
async function getMarketDataContext(): Promise<string> {
  try {
    const SYMBOLS = {
      "^GSPC": { name: "S&P 500", currency: "USD" },
      "^GSPTSE": { name: "S&P/TSX", currency: "CAD" },
      "^IXIC": { name: "NASDAQ", currency: "USD" },
      "CADUSD=X": { name: "CAD/USD", currency: "" },
    };

    const symbolList = Object.keys(SYMBOLS).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) return "";

    const data = await res.json();
    const quotes = (data.quoteResponse?.result || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q: any) => ({
        name: SYMBOLS[q.symbol as keyof typeof SYMBOLS]?.name || q.shortName || q.symbol,
        price: q.regularMarketPrice || 0,
        changePercent: q.regularMarketChangePercent || 0,
        currency: SYMBOLS[q.symbol as keyof typeof SYMBOLS]?.currency || "",
      })
    );

    if (quotes.length === 0) return "";

    const lines = quotes.map(
      (q: {
        name: string;
        price: number;
        changePercent: number;
        currency: string;
      }) =>
        `- ${q.name}: ${q.price.toLocaleString("fr-CA")} ${q.currency} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`
    );

    return `${lines.join("\n")}\n(Données en date du ${new Date().toLocaleDateString("fr-CA", { dateStyle: "long" })})`;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limiting: 50 requests per minute per user (was 10)
    const rateLimit = await checkRateLimit(`chat:${user.id}`, 50);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetInSeconds);
    }

    // Check subscription plan chat limit
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const userPlan = (subscription?.plan || "free") as SubscriptionPlan;
    const dailyLimit = getChatLimit(userPlan);

    if (dailyLimit > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user")
        .gte("created_at", todayStart.toISOString());

      if ((count ?? 0) >= dailyLimit) {
        return new Response(
          JSON.stringify({
            error: `Limite de ${dailyLimit} messages par jour atteinte. Passez à un plan supérieur pour continuer.`,
            upgradeRequired: true,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Corps de requête invalide" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const parseResult = chatBodySchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error:
            parseResult.error.issues[0]?.message || "Données invalides",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { message } = parseResult.data;

    // Get user context + market data in parallel
    const [
      { data: profile },
      { data: clientInfo },
      { data: goals },
      { data: riskAssessment },
      { data: selectedPortfolio },
      { data: chatHistory },
      marketData,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
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
        .order("is_selected", { ascending: false }), // Selected first, then others
      supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20), // Increased from 10 to 20 for better conversation continuity
      getMarketDataContext(),
    ]);

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: message,
    });

    // Build system prompt with full client context
    const portfolios = (selectedPortfolio as any[] || []);
    const activePortfolio = portfolios.find(p => p.is_selected) || portfolios[0];

    // Process all portfolios for comparison
    const allPortfoliosContext = portfolios.map(p => ({
      name: p.name,
      type: p.type,
      is_active: p.is_selected,
      expectedReturn: p.expected_return,
      volatility: p.volatility,
      allocations: (p.portfolio_allocations || []).map((a: any) => ({
        ticker: a.instrument_ticker,
        weight: a.weight
      }))
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawAllocations = (activePortfolio?.portfolio_allocations ?? []);
    const allocations = rawAllocations.map((a: any) => ({
      asset_class: a.asset_class as string,
      instrument_name: a.instrument_name as string,
      instrument_ticker: a.instrument_ticker as string,
      weight: a.weight as number,
      suggested_account: a.suggested_account as string | null,
    }));

    // PRE-CALCULATE ANALYSIS to save AI thinking time
    const portfolioValue = Number(clientInfo?.total_assets || 0);
    const portfolioAnalysis = activePortfolio ? {
      totalValue: portfolioValue,
      drift: rawAllocations.reduce((sum: number, a: any) => sum + Math.abs((a.weight || 0) - (a.target_weight || a.weight || 0)), 0),
      needsRebalancing: rawAllocations.some((a: any) => Math.abs((a.weight || 0) - (a.target_weight || a.weight || 0)) > 5),
    } : null;

    const goalAnalysis = (goals ?? []).map((g: any) => {
      const remaining = (g.target_amount || 0) - (g.current_amount || 0);
      const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
      return {
        label: g.label,
        progress: `${progress.toFixed(1)}%`,
        isOnTrack: true, // simplified
        remainingAmount: remaining
      };
    });

    // Build persona context for CFA-grade personalization
    const personaData = {
      age: clientInfo?.age ?? null,
      investmentExperience: clientInfo?.investment_experience ?? null,
      riskScore: riskAssessment?.risk_score ?? 5,
      riskProfile: riskAssessment?.risk_profile ?? "modéré",
      hasDependents: (clientInfo?.dependents ?? 0) > 0,
      hasReee: clientInfo?.has_reee ?? false,
      annualIncome: clientInfo?.annual_income ?? null,
      totalDebts: clientInfo?.total_debts ?? null,
      totalAssets: clientInfo?.total_assets ?? null,
      monthlySavings: clientInfo?.monthly_savings ?? null,
      monthlyExpenses: clientInfo?.monthly_expenses ?? null,
      celiBalance: clientInfo?.celi_balance ?? null,
      reerBalance: clientInfo?.reer_balance ?? null,
    };

    const persona = buildClientPersonaContext(personaData);
    const milestones = detectClientMilestones({
      ...personaData,
      hasCeliapp: clientInfo?.has_celiapp ?? false,
      goals: (goals ?? []).map((g: any) => ({
        label: g.label as string,
        targetAmount: g.target_amount as number,
        currentAmount: g.current_amount as number,
        targetDate: g.target_date as string | null,
      })),
    });

    const systemPrompt = getChatSystemPrompt({
      clientName: profile?.full_name || "Client",
      clientAge: clientInfo?.age ?? null,
      clientProfession: clientInfo?.profession ?? null,
      clientFamilySituation: clientInfo?.family_situation ?? null,
      clientDependents: clientInfo?.dependents ?? null,
      clientInvestmentExperience: clientInfo?.investment_experience ?? null,
      clientTaxBracket: clientInfo?.tax_bracket ?? null,
      annualIncome: clientInfo?.annual_income ?? null,
      monthlyExpenses: clientInfo?.monthly_expenses ?? null,
      totalAssets: clientInfo?.total_assets ?? null,
      totalDebts: clientInfo?.total_debts ?? null,
      monthlySavings: clientInfo?.monthly_savings ?? null,
      celiBalance: clientInfo?.celi_balance ?? null,
      reerBalance: clientInfo?.reer_balance ?? null,
      reeeBalance: clientInfo?.reee_balance ?? null,
      hasCeli: clientInfo?.has_celi ?? false,
      hasReer: clientInfo?.has_reer ?? false,
      hasReee: clientInfo?.has_reee ?? false,
      riskScore: riskAssessment?.risk_score ?? 5,
      riskProfile: riskAssessment?.risk_profile ?? "modéré",
      riskAnalysis: riskAssessment?.ai_analysis ?? null,
      riskKeyFactors: (riskAssessment?.key_factors as string[] | null) ?? null,
      portfolio: activePortfolio
        ? {
          name: activePortfolio.name,
          type: activePortfolio.type,
          expectedReturn: activePortfolio.expected_return,
          volatility: activePortfolio.volatility,
          sharpeRatio: (activePortfolio as any).sharpe_ratio ?? null,
          maxDrawdown: (activePortfolio as any).max_drawdown ?? null,
          totalMer: (activePortfolio as any).total_mer ?? null,
          taxStrategy: (activePortfolio as any).tax_strategy ?? null,
          rationale: (activePortfolio as any).ai_rationale ?? null,
          allocations,
          // Inject pre-calculated metrics
          metrics: portfolioAnalysis,
          // Include all portfolios for comparison
          allPortfolios: allPortfoliosContext,
        }
        : null,
      goals: (goals ?? []).map((g: any, i: number) => ({
        type: g.type as string,
        label: g.label as string,
        targetAmount: g.target_amount as number,
        currentAmount: g.current_amount as number,
        targetDate: g.target_date as string | null,
        priority: g.priority as string,
        analysis: goalAnalysis[i],
      })),
      marketData: marketData || undefined,
      persona,
      milestones,
    });

    // Build conversation history
    const history = (chatHistory || [])
      .reverse()
      .map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    // Add current message
    history.push({ role: "user" as const, content: message });

    // Convert tools to the format expected by the unified client
    const toolDefs = AI_TOOLS.map((t) => ({
      name: t.name,
      description: t.description || "",
      input_schema: t.input_schema as Record<string, unknown>,
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        try {
          // Call unified AI client with tool support and request a stream for the final part
          const streamResponse = await chatWithTools({
            systemPrompt,
            messages: history,
            tools: toolDefs,
            executeTool,
            maxTokens: 2048,
            streamFinal: true,
          });

          let fullResponse = "";

          for await (const chunk of streamResponse) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`)
              );
            }
          }

          // Save assistant message
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: fullResponse,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          closed = true;
        } catch (error: any) {
          console.error("Chat stream error:", error);
          if (!closed) {
            try {
              const errorMessage = error?.status === 429
                ? "Service temporairement surchargé. Réessayez dans quelques secondes."
                : `Désolé, j'ai rencontré une difficulté technique : ${error?.message || "Erreur inconnue"}`;

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    error: errorMessage,
                  })}\n\n`
                )
              );
              controller.close();
            } catch {
              // Controller already closed
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
