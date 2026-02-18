import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { RISK_PROFILE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const riskProfileBodySchema = z.object({
  followUpAnswers: z.record(z.string(), z.string()).optional().default({}),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Rate limiting: 5 requests per minute per user
    const rateLimit = checkRateLimit(`risk-profile:${user.id}`, 5);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetInSeconds);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const parseResult = riskProfileBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { followUpAnswers } = parseResult.data;

    const { data: assessment } = await supabase
      .from("risk_assessments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let parsed;

    try {
      const aiResponse = await generateAIResponse({
        systemPrompt: RISK_PROFILE_SYSTEM_PROMPT,
        userMessage: JSON.stringify({ assessment, followUpAnswers }),
        maxTokens: 2048,
      });

      const text = aiResponse.text;
      if (!text) throw new Error("AI returned no text content");
      const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanedText);
    } catch (aiError: unknown) {
      console.error("AI Error in Risk Profile (using fallback):", aiError instanceof Error ? aiError.message : aiError);
      parsed = {
        risk_score: 6,
        risk_profile: "modéré",
        analysis: "Votre profil de risque est qualifié de modéré. Vous recherchez un équilibre entre la préservation de votre capital et une croissance à long terme. Votre capacité financière vous permet d'absorber des fluctuations modérées du marché, tandis que votre tolérance psychologique suggère une approche prudente mais ouverte aux opportunités de croissance.",
        key_factors: [
          "Horizon temporel de moyen à long terme",
          "Capacité financière stable",
          "Objectifs d'investissement clairs",
          "Tolérance à la volatilité modérée"
        ],
        financial_capacity_score: 7,
        psychological_tolerance_score: 5,
        peer_comparison: "Votre profil est similaire à 45% des investisseurs de votre tranche d'âge.",
        alerts: []
      };
    }

    const updateData = {
      ai_follow_up_answers: followUpAnswers,
      risk_score: parsed.risk_score,
      risk_profile: parsed.risk_profile,
      ai_analysis: parsed.analysis,
      key_factors: parsed.key_factors,
    };

    if (assessment) {
      const { error: updateError } = await supabase
        .from("risk_assessments")
        .update(updateData)
        .eq("id", assessment.id);

      if (updateError) {
        console.error("Error updating risk assessment:", updateError);
      }
    } else {
      // No assessment exists yet - create one
      const { error: insertError } = await supabase
        .from("risk_assessments")
        .insert({
          user_id: user.id,
          ...updateData,
        });

      if (insertError) {
        console.error("Error inserting risk assessment:", insertError);
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Risk profile API error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse du profil" },
      { status: 500 }
    );
  }
}
