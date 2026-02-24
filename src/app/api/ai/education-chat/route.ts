import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChatResponse } from "@/lib/ai/client";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `Tu es Alex, le conseiller IA de WealthPilot, spécialisé en finance personnelle canadienne.
L'utilisateur lit un article éducatif et te pose une question dessus.

Tes directives :
- Répondre de manière claire, concise et pratique (2-3 paragraphes max)
- Ancrer ta réponse dans le contexte canadien : CELI, REER, fiscalité canadienne, ETFs canadiens cotés en TSX
- Utiliser le contenu de l'article comme base, enrichir avec des exemples chiffrés concrets
- Parler comme un conseiller compétent mais accessible — éviter le jargon inutile
- Ne jamais recommander de titres individuels spécifiques
- Rappeler brièvement de consulter un conseiller pour les décisions personnelles importantes

Article consulté :
Titre : {articleTitle}

Contenu :
{articleContent}`;

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

    // 20 requests per minute per user (lighter than main chat)
    const rateLimit = await checkRateLimit(`edu-chat:${user.id}`, 20);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetInSeconds);
    }

    const body = await request.json();
    const {
      question,
      articleTitle,
      articleContent,
      history = [],
    } = body as {
      question: string;
      articleTitle: string;
      articleContent: string;
      history: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!question?.trim() || !articleTitle) {
      return new Response(JSON.stringify({ error: "Données manquantes" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{articleTitle}", articleTitle).replace(
      "{articleContent}",
      articleContent || ""
    );

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history,
      { role: "user", content: question },
    ];

    const aiResponse = await generateChatResponse({
      systemPrompt,
      messages,
      maxTokens: 600,
      temperature: 0.7,
    });

    const fullResponse = aiResponse.text;

    // Stream word-by-word (same pattern as main chat)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        try {
          const words = fullResponse.split(/(\s+)/);
          for (let i = 0; i < words.length; i++) {
            const chunk = words.slice(i, i + 3).join("");
            i += 2;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
            await new Promise((resolve) => setTimeout(resolve, 15));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          closed = true;
        } catch (error) {
          console.error("Education chat stream error:", error);
          if (!closed) {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: "Erreur lors de la génération" })}\n\n`
                )
              );
              controller.close();
            } catch {
              // Already closed
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
    console.error("Education chat API error:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
