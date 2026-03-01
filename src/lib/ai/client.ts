import Groq from "groq-sdk";
import OpenAI from "openai";

// ============================================================
// AI Provider Configuration
// PRIMARY: Google Gemini 2.0 Flash (billing activée, quota illimité)
// FALLBACK: Groq llama-3.1-8b-instant (500k TPD, quota séparé du 70b)
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Groq: utiliser seulement le modèle rapide 8b comme fallback
// (le 70b a un quota journalier de 100k tokens — épuisé trop vite)
const GROQ_MODEL_FALLBACK = "llama-3.1-8b-instant"; // 500k TPD, quota séparé

// Gemini: provider principal (facturation active)
const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const GEMINI_MODEL = "gemini-2.0-flash";

export const AI_MODEL = GEMINI_MODEL;
export const AI_MODEL_FAST = GEMINI_MODEL;

// ============================================================
// Types
// ============================================================

export interface AIResponse {
  text: string;
}

// Helper: Gemini primary, Groq 8b comme fallback automatique
async function callWithFallback(
  geminiCall: () => Promise<any>,
  groqFallbackCall: () => Promise<any>
): Promise<any> {
  try {
    return await geminiCall();
  } catch (e: any) {
    // Fallback Groq sur quota/erreur Gemini
    if (e?.status === 429 || e?.status === 400 || e?.status === 503 || e?.status === 500) {
      console.warn("[AI] Gemini error", e.status, "→ fallback Groq 8b");
      return await groqFallbackCall();
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
        model: GROQ_MODEL_FALLBACK,
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
      gemini.chat.completions.create({
        model: GEMINI_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: allMessages,
      }),
    () =>
      groq.chat.completions.create({
        model: GROQ_MODEL_FALLBACK,
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
    console.warn("[AI] Gemini stream error", e.status, "→ fallback Groq 8b");
  }

  return await groq.chat.completions.create({
    model: GROQ_MODEL_FALLBACK,
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
    try {
      return await gemini.chat.completions.create({
        model: GEMINI_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: msgs,
        tools: toolsList.length > 0 ? toolsList : undefined,
        tool_choice: toolsList.length > 0 ? "auto" : undefined,
        stream: false,
      });
    } catch (e: any) {
      if (e?.status !== 429 && e?.status !== 400 && e?.status !== 503 && e?.status !== 500) throw e;
      console.warn("[AI] Gemini tools error", e.status, "→ fallback Groq 8b");
    }
    // Groq 8b fallback
    return await groq.chat.completions.create({
      model: GROQ_MODEL_FALLBACK,
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
    // Streaming final: Gemini primary, Groq 8b fallback
    try {
      return await gemini.chat.completions.create({
        model: GEMINI_MODEL,
        max_tokens: maxTokens,
        temperature,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: msgHistory as any,
        stream: true,
      });
    } catch (e: any) {
      if (e?.status !== 429 && e?.status !== 400 && e?.status !== 503 && e?.status !== 500) throw e;
      console.warn("[AI] Gemini streamFinal error", e.status, "→ fallback Groq 8b");
    }
    return await groq.chat.completions.create({
      model: GROQ_MODEL_FALLBACK,
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
