import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatWithTools } from "@/lib/ai/client";
import { getChatSystemPrompt } from "@/lib/ai/prompts";
import { AI_TOOLS, executeTool } from "@/lib/ai/tools";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getChatLimit } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/types/database";

const chatBodySchema = z.object({
  message: z.string().min(1, "Message vide").max(5000, "Message trop long"),
});

// Fetch live market data for AI context
async function getMarketDataContext(): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/market/quotes`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return "";

    const data = await res.json();
    const quotes = data.quotes || [];
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

    // Rate limiting: 10 requests per minute per user
    const rateLimit = checkRateLimit(`chat:${user.id}`, 10);
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
        .eq("is_selected", true)
        .maybeSingle(),
      supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      getMarketDataContext(),
    ]);

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: message,
    });

    // Build system prompt with market data
    const systemPrompt = getChatSystemPrompt({
      profile: `Nom: ${profile?.full_name || "Inconnu"}, Âge: ${clientInfo?.age || "N/A"}, Profession: ${clientInfo?.profession || "N/A"}, Situation: ${clientInfo?.family_situation || "N/A"}`,
      riskScore: riskAssessment?.risk_score || 5,
      riskProfile: riskAssessment?.risk_profile || "modéré",
      portfolioType: selectedPortfolio
        ? `${selectedPortfolio.name} (${selectedPortfolio.type}) - Rendement: ${selectedPortfolio.expected_return}%, Volatilité: ${selectedPortfolio.volatility}%`
        : "Aucun sélectionné",
      goals:
        goals
          ?.map(
            (g: {
              type: string;
              label: string;
              target_amount: number;
              current_amount: number;
            }) =>
              `${g.type}: ${g.label} - Cible: ${g.target_amount}$, Actuel: ${g.current_amount}$`
          )
          .join("\n") || "Aucun objectif",
      financialSummary: `Revenu: ${clientInfo?.annual_income || "N/A"}$, Actifs: ${clientInfo?.total_assets || "N/A"}$, Dettes: ${clientInfo?.total_debts || "N/A"}$, Épargne: ${clientInfo?.monthly_savings || "N/A"}$/mois, CELI: ${clientInfo?.has_celi ? `Oui (${clientInfo.celi_balance}$)` : "Non"}, REER: ${clientInfo?.has_reer ? `Oui (${clientInfo.reer_balance}$)` : "Non"}`,
      marketData: marketData || undefined,
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

    // Stream response with tool use support
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        try {
          // Call unified AI client with tool support
          const aiResponse = await chatWithTools({
            systemPrompt,
            messages: history,
            tools: toolDefs,
            executeTool,
            maxTokens: 2048,
          });

          const fullResponse = aiResponse.text;

          // Stream word-by-word for smooth UX
          const words = fullResponse.split(/(\s+)/);
          for (let i = 0; i < words.length; i++) {
            const chunk = words.slice(i, i + 3).join("");
            i += 2;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: chunk })}\n\n`
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 15));
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
        } catch (error) {
          console.error("Chat stream error:", error);
          if (!closed) {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    error: "Erreur lors de la génération",
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
