import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { buildPortfolioSystemPrompt, buildPortfolioUserMessage } from "@/lib/ai/prompts";
import { getInstrumentsSummaryCompact } from "@/lib/data/instruments";
import { getConstraintsSummaryForPrompt } from "@/lib/portfolio/constraints";
import { validateAndEnrichPortfolios, cleanAndParsePortfolioJSON } from "@/lib/portfolio/validator";
import { generateFallbackPortfolios } from "@/lib/portfolio/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { RiskProfile } from "@/types/database";
import type { EnrichedPortfolio } from "@/lib/portfolio/validator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Rate limiting: 5 requests per minute per user
    const rateLimit = await checkRateLimit(`portfolio:${user.id}`, 5);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetInSeconds);
    }

    // Parse body for force flag
    let forceRegenerate = false;
    try {
      const body = await request.json();
      forceRegenerate = body?.force === true;
    } catch {
      // No body or invalid — that's fine
    }

    // Check if portfolios already exist
    const { data: existingPortfolios } = await supabase
      .from("portfolios")
      .select("id")
      .eq("user_id", user.id);

    const existingIds = existingPortfolios?.map((p) => p.id) ?? [];

    if (existingIds.length > 0 && !forceRegenerate) {
      return NextResponse.json({ message: "Portfolios already exist" });
    }

    // Fetch all user data
    const [{ data: clientInfo }, { data: goals }, { data: assessment }] = await Promise.all([
      supabase.from("client_info").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase
        .from("risk_assessments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!clientInfo && !assessment) {
      return NextResponse.json(
        { error: "Données utilisateur insuffisantes. Complétez votre profil et l'évaluation de risque." },
        { status: 400 }
      );
    }

    const riskProfile: RiskProfile = (assessment?.risk_profile as RiskProfile) || 'modéré';

    let enrichedPortfolios: EnrichedPortfolio[];
    let fallbackUsed = false;

    try {
      // Build dynamic prompts with user data
      const instrumentsSummary = getInstrumentsSummaryCompact();
      const systemPrompt = buildPortfolioSystemPrompt(instrumentsSummary);

      const constraintsSummary = getConstraintsSummaryForPrompt(riskProfile);
      const userMessage = buildPortfolioUserMessage({
        clientInfo: clientInfo || {
          age: null, profession: null, family_situation: null, dependents: null,
          annual_income: null, monthly_expenses: null, total_assets: null,
          total_debts: null, monthly_savings: null, investment_experience: null,
          has_celi: false, has_reer: false, has_reee: false,
          celi_balance: null, reer_balance: null, reee_balance: null,
          has_celiapp: false, celiapp_balance: null,
          has_cri: false, cri_balance: null,
          has_frv: false, frv_balance: null,
          tax_bracket: null,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        goals: (goals || []).map((g: any) => ({
          type: g.type as string,
          label: g.label as string,
          target_amount: g.target_amount as number,
          current_amount: g.current_amount as number,
          target_date: g.target_date as string | null,
          priority: g.priority as string,
        })),
        assessment: {
          risk_score: assessment?.risk_score ?? null,
          risk_profile: assessment?.risk_profile ?? null,
          ai_analysis: assessment?.ai_analysis ?? null,
          key_factors: assessment?.key_factors as string[] ?? null,
        },
        constraintsSummary,
      });

      const aiResponse = await generateAIResponse({
        systemPrompt,
        userMessage,
        maxTokens: 12000,
        temperature: 0.2,
      });

      const text = aiResponse.text;
      if (!text) {
        throw new Error("AI returned no text content");
      }
      const parsed = cleanAndParsePortfolioJSON(text);

      // Validate and enrich AI response
      const validation = validateAndEnrichPortfolios(parsed, riskProfile);

      if (validation.valid) {
        enrichedPortfolios = validation.portfolios;
        if (validation.warnings.length > 0) {
          logger.warn("Portfolio validation warnings:", validation.warnings);
        }
      } else {
        logger.error("AI portfolio validation failed:", validation.errors);
        logger.warn("Falling back to deterministic portfolios");
        enrichedPortfolios = generateFallbackPortfolios(riskProfile);
        fallbackUsed = true;
      }
    } catch (aiError: unknown) {
      logger.error("AI Error in Portfolio (using fallback):", aiError instanceof Error ? aiError.message : aiError);
      enrichedPortfolios = generateFallbackPortfolios(riskProfile);
      fallbackUsed = true;
    }

    const finalPortfolios = [];

    // Save portfolios to database
    for (const portfolio of enrichedPortfolios) {
      // Try with extended columns first
      let savedPortfolio: { id: string } | null = null;

      const { data: fullData, error: fullError } = await supabase
        .from("portfolios")
        .insert({
          user_id: user.id,
          type: portfolio.type,
          name: portfolio.name,
          description: portfolio.description,
          expected_return: portfolio.expected_return,
          volatility: portfolio.volatility,
          sharpe_ratio: portfolio.sharpe_ratio,
          max_drawdown: portfolio.max_drawdown,
          total_mer: portfolio.total_mer,
          is_selected: portfolio.type === "suggéré",
          ai_rationale: portfolio.rationale,
          tax_strategy: portfolio.tax_strategy,
          stress_test: portfolio.stress_test,
        })
        .select("id")
        .single();

      if (fullError) {
        // If columns don't exist yet, retry with base schema only
        if (fullError.message?.includes('column') || fullError.code === 'PGRST204' || fullError.code === '42703') {
          logger.warn(`Extended columns not available, using base schema for ${portfolio.type}`);
          const { data: basicData, error: basicError } = await supabase
            .from("portfolios")
            .insert({
              user_id: user.id,
              type: portfolio.type,
              name: portfolio.name,
              description: portfolio.description,
              expected_return: portfolio.expected_return,
              volatility: portfolio.volatility,
              sharpe_ratio: portfolio.sharpe_ratio,
              max_drawdown: portfolio.max_drawdown,
              is_selected: portfolio.type === "suggéré",
              ai_rationale: portfolio.rationale,
            })
            .select("id")
            .single();

          if (basicError) {
            logger.error(`Error saving portfolio ${portfolio.type} (basic): `, basicError);
            continue;
          }
          savedPortfolio = basicData;
        } else {
          logger.error(`Error saving portfolio ${portfolio.type}: `, fullError);
          continue;
        }
      } else {
        savedPortfolio = fullData;
      }

      if (savedPortfolio) {
        finalPortfolios.push({
          ...portfolio,
          id: savedPortfolio.id
        });

        // Try with new columns first, fallback without them if migration not applied yet
        const allocations = portfolio.allocations.map((a) => ({
          portfolio_id: savedPortfolio.id,
          asset_class: a.asset_class,
          sub_class: a.sub_class,
          instrument_name: a.instrument_name,
          instrument_ticker: a.instrument_ticker,
          weight: a.weight,
          expected_return: a.expected_return,
          description: a.description,
          suggested_account: a.suggested_account,
          mer: a.mer,
          currency: a.currency,
          isin: a.isin,
        }));

        const { error: allocError } = await supabase.from("portfolio_allocations").insert(allocations);

        if (allocError) {
          logger.error(`Error saving allocations for ${portfolio.type}: `, allocError);
          if (allocError.message?.includes('column') || allocError.code === '42703') {
            // New columns don't exist yet, insert without them
            const basicAllocations = portfolio.allocations.map((a) => ({
              portfolio_id: savedPortfolio.id,
              asset_class: a.asset_class,
              sub_class: a.sub_class,
              instrument_name: a.instrument_name,
              instrument_ticker: a.instrument_ticker,
              weight: a.weight,
              expected_return: a.expected_return,
              description: a.description,
            }));
            const { error: basicError } = await supabase.from("portfolio_allocations").insert(basicAllocations);
            if (basicError) {
              logger.error(`Basic allocation insert also failed for ${portfolio.type}, deleting orphan portfolio: `, basicError);
              await supabase.from("portfolios").delete().eq("id", savedPortfolio.id);
              finalPortfolios.pop();
            }
          } else {
            // Other allocation error - delete orphan portfolio
            logger.error(`Non - schema allocation error for ${portfolio.type}, deleting orphan portfolio`);
            await supabase.from("portfolios").delete().eq("id", savedPortfolio.id);
            finalPortfolios.pop();
          }
        }
      }
    }

    if (finalPortfolios.length === 0) {
      return NextResponse.json(
        { error: "Aucun portefeuille n'a pu être sauvegardé" },
        { status: 500 }
      );
    }

    // Now that new portfolios are saved successfully, delete the old ones
    if (existingIds.length > 0) {
      await supabase.from("portfolios").delete().in("id", existingIds);
    }

    return NextResponse.json({ portfolios: finalPortfolios, fallbackUsed });
  } catch (error: unknown) {
    logger.error("Portfolio API error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des portefeuilles" },
      { status: 500 }
    );
  }
}
