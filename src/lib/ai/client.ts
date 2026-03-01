import Groq from "groq-sdk";
import OpenAI from "openai";

// ============================================================
// AI Provider Configuration
// PRIMARY: Google Gemini 2.0 Flash (si GOOGLE_AI_API_KEY présent et quota OK)
// FALLBACK: Groq Llama 3.3 70B (toujours disponible)
// Pour basculer définitivement vers Gemini: activer la facturation sur
// https://aistudio.google.com et s'assurer que le quota est > 0
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_MODEL_FAST = "llama-3.1-8b-instant";

// Gemini client (utilisé seulement si disponible et facturé)
const geminiAvailable = !!process.env.GOOGLE_AI_API_KEY && process.env.USE_GEMINI === "true";
const gemini = geminiAvailable
  ? new OpenAI({
    apiKey: process.env.GOOGLE_AI_API_KEY!,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  })
  : null;

const GEMINI_MODEL = "gemini-2.0-flash";

export const AI_MODEL = geminiAvailable ? GEMINI_MODEL : GROQ_MODEL;
export const AI_MODEL_FAST = geminiAvailable ? GEMINI_MODEL : GROQ_MODEL_FAST;

// ============================================================
// Types
// ============================================================

export interface AIResponse {
  text: string;
}

// Helper: appelle Gemini si disponible, sinon Groq. Retry automatique sur 429.
async function callWithFallback(
  geminiCall: () => Promise<any>,
  groqCall: () => Promise<any>
): Promise<any> {
  if (gemini && geminiAvailable) {
    try {
      return await geminiCall();
    } catch (e: any) {
      // Quota épuisé ou indisponible → fallback Groq
      if (e?.status === 429 || e?.status === 400 || e?.status === 503) {
        console.warn("[AI] Gemini unavailable, falling back to Groq:", e.status);
      } else {
        throw e;
      }
    }
  }
  // Groq avec retry automatique sur 429 (rate limit par minute)
  try {
    return await groqCall();
  } catch (e: any) {
    if (e?.status === 429) {
      console.warn("[AI] Groq 429, retrying with fast model...");
      // Retry avec modèle rapide
      await new Promise((r) => setTimeout(r, 1500));
      return await groqCall();
    }
    throw e;
  }
}

// ============================================================
// generateAIResponse — Réponse simple (insights, rapports, etc.)
// ============================================================

export async function generateAIResponse(options: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const { systemPrompt, userMessage, maxTokens = 2048, temperature = 0.7 } = options;

  const response = await callWithFallback(
    () =>
      gemini!.chat.completions.create({
        model: GEMINI_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    () =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      })
  );

  const text = response.choices[0]?.message?.content || "";
  return { text };
}

// ============================================================
// generateChatResponse — Chat avec historique (sans outils)
// ============================================================

export async function generateChatResponse(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const { systemPrompt, messages, maxTokens = 2048, temperature = 0.7 } = options;

  const allMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }, ...messages];

  const response = await callWithFallback(
    () =>
      gemini!.chat.completions.create({
        model: GEMINI_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: allMessages,
      }),
    () =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: allMessages,
      })
  );

  const text = response.choices[0]?.message?.content || "";
  return { text };
}

// ============================================================
// streamChatResponse — Streaming SSE (education-chat, etc.)
// ============================================================

export async function streamChatResponse(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  const { systemPrompt, messages, maxTokens = 600, temperature = 0.7 } = options;

  const allMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }, ...messages];

  if (gemini && geminiAvailable) {
    try {
      return await gemini.chat.completions.create({
        model: GEMINI_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: allMessages,
        stream: true,
      });
    } catch (e: any) {
      if (e?.status !== 429 && e?.status !== 400 && e?.status !== 503) throw e;
      console.warn("[AI] Gemini stream unavailable, falling back to Groq:", e.status);
    }
  }

  return await groq.chat.completions.create({
    model: GROQ_MODEL_FAST,
    max_tokens: maxTokens,
    temperature,
    messages: allMessages,
    stream: true,
  });
}

// ============================================================
// chatWithTools — Chat complet avec tool-calling + streaming final
// ============================================================

interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

type ToolInput = Record<string, unknown>;

export async function chatWithTools(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools: Tool[];
  executeTool: (name: string, args: ToolInput) => string;
  maxTokens?: number;
  temperature?: number;
  streamFinal?: boolean;
  onToolCall?: (toolName: string) => void;
}): Promise<any> {
  const {
    systemPrompt,
    messages,
    tools,
    executeTool,
    maxTokens = 2048,
    temperature = 0.7,
    streamFinal = false,
    onToolCall,
  } = options;

  // Convert tools to OpenAI/Groq function calling format
  const openAITools = tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));

  const msgHistory: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
  }> = [{ role: "system", content: systemPrompt }, ...messages];

  const callAI = async (msgs: any[], toolsList: any[]) => {
    const useGemini = gemini && geminiAvailable;
    if (useGemini) {
      try {
        return await gemini!.chat.completions.create({
          model: GEMINI_MODEL,
          max_tokens: maxTokens,
          temperature,
          messages: msgs,
          tools: toolsList.length > 0 ? toolsList : undefined,
          tool_choice: toolsList.length > 0 ? "auto" : undefined,
          stream: false,
        });
      } catch (e: any) {
        if (e?.status !== 429 && e?.status !== 400 && e?.status !== 503) throw e;
        console.warn("[AI] Gemini tools unavailable, falling back to Groq:", e.status);
      }
    }
    // Groq fallback
    return await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: msgs,
      tools: toolsList.length > 0 ? toolsList : undefined,
      tool_choice: toolsList.length > 0 ? "auto" : undefined,
      stream: false,
    });
  };

  let response = await callAI(msgHistory, openAITools);
  let maxIterations = 10;

  while (maxIterations > 0) {
    const choice = response.choices[0];
    if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
      break;
    }

    maxIterations--;
    msgHistory.push(choice.message as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const toolCall of (choice.message.tool_calls as any[])) {
      if (onToolCall) onToolCall(toolCall.function.name);

      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (e) {
        console.warn(`Failed to parse tool arguments for ${toolCall.function.name}:`, toolCall.function.arguments);
      }

      const result = executeTool(toolCall.function.name, args);
      msgHistory.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    response = await callAI(msgHistory, openAITools);
  }

  if (streamFinal) {
    // Always use Groq for streaming final response (reliable, no quota issues)
    // Gemini stream will be used only when explicitly enabled AND quota is confirmed available
    return await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: msgHistory as any,
      stream: true,
    });
  }

  const text = response.choices[0]?.message?.content || "";
  return { text };
}
