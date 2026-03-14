import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

// Always return 200 — this is a fire-and-forget background update
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(null, { status: 200 });

    // Fetch recent messages (last 40 — enough context without being wasteful)
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);

    // Need at least 6 messages before building memory
    if (!messages || messages.length < 6) {
      return new Response(null, { status: 200 });
    }

    // Fetch existing memory + first name
    const { data: profile } = await supabase
      .from("profiles")
      .select("chat_memory, full_name")
      .eq("id", user.id)
      .single();

    const existingMemory = (profile as { chat_memory?: string | null })?.chat_memory ?? "";
    const firstName = profile?.full_name?.split(" ")[0] || "l'utilisateur";

    // Format last 30 messages for context (truncate each to control tokens)
    const contextMessages = messages
      .slice()
      .reverse()
      .slice(-30)
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? firstName : "Alex"}: ${m.content.substring(0, 400)}`
      )
      .join("\n\n");

    const { text: memory } = await generateAIResponse({
      systemPrompt: `Tu es un assistant qui maintient la mémoire conversationnelle d'un conseiller financier IA (Alex).
Ton rôle : extraire les informations importantes d'une conversation pour enrichir le contexte des prochaines sessions.

Réponds UNIQUEMENT avec des bullet points courts et factuels. Maximum 8 bullets.
Si rien de nouveau ou notable, réponds exactement : "Rien de nouveau."

Capture uniquement :
- Préoccupations spécifiques non présentes dans le profil (ex: "stress lié à une dette de carte", "peur de manquer la retraite")
- Préférences de communication (ex: "préfère les exemples concrets", "veut du simple", "aime les chiffres")
- Intentions ou décisions exprimées (ex: "veut ouvrir CELI ce mois-ci", "envisage RAP dans 2 ans")
- Infos de vie mentionnées informellement (ex: "promotion attendue en juin", "bébé en route", "achat voiture")
- Sujets déjà bien expliqués à ne pas répéter (ex: "différence CELI/REER déjà expliquée")

N'inclus PAS : données déjà dans le profil DB (revenu, âge, soldes CELI/REER, portefeuille), explications génériques, données de marché.`,
      userMessage: `Mémoire existante :
${existingMemory || "(aucune mémoire précédente)"}

Conversation récente (${messages.length} messages au total) :
${contextMessages}

Génère la mémoire mise à jour (bullets concis, max 8 lignes) :`,
      maxTokens: 300,
      temperature: 0.2,
    });

    const trimmed = memory.trim();
    if (trimmed && trimmed !== "Rien de nouveau.") {
      await supabase
        .from("profiles")
        .update({ chat_memory: trimmed })
        .eq("id", user.id);
    }
  } catch (error) {
    logger.error("Chat memory update error:", error);
    // Silent failure — non-critical background task
  }

  return new Response(null, { status: 200 });
}
