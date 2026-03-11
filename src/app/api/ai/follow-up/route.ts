import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { FOLLOW_UP_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const followUpBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Rate limiting: 5 requests per minute per user
    const rateLimit = await checkRateLimit(`follow-up:${user.id}`, 5);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetInSeconds);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const parseResult = followUpBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { answers } = parseResult.data;

    let parsed;

    try {
      const aiResponse = await generateAIResponse({
        systemPrompt: FOLLOW_UP_SYSTEM_PROMPT,
        userMessage: JSON.stringify(answers),
        maxTokens: 1024,
      });

      const text = aiResponse.text;
      if (!text) throw new Error("AI returned no text content");
      const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanedText);
    } catch (aiError: unknown) {
      logger.error("AI Error (using fallback):", aiError instanceof Error ? aiError.message : aiError);
      parsed = {
        questions: [
          "Quels sont vos objectifs financiers principaux pour les 5 prochaines années ?",
          "Comment réagiriez-vous si votre investissement baissait de 20% en un mois ?",
          "Avez-vous déjà investi dans des produits financiers complexes (options, crypto, etc.) ?"
        ]
      };
    }

    // Update risk assessment with questions
    const { data: assessment } = await supabase
      .from("risk_assessments")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessment) {
      const { error: updateError } = await supabase
        .from("risk_assessments")
        .update({ ai_follow_up_questions: parsed.questions })
        .eq("id", assessment.id);

      if (updateError) {
        logger.error("Error updating follow-up questions:", updateError);
      }
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    logger.error("Follow-up API error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des questions" },
      { status: 500 }
    );
  }
}
