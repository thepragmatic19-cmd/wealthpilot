import Groq from "groq-sdk";
import OpenAI from "openai";

// ============================================================
// AI Provider Configuration
//
// PRIMARY:  Google Gemini (via OpenAI-compatible endpoint)
//   - GEMINI_MODEL_LITE  → gemini-2.0-flash-lite  (streaming chat, fast, no thinking)
//   - GEMINI_MODEL_FULL  → gemini-2.5-flash        (complex analysis, reports)
//
// FALLBACK: Groq llama-3.1-8b-instant (500k TPD, separate quota pool)
//
// Why two Gemini models?
//   gemini-2.5-flash uses internal "thinking tokens" which consume from
//   the max_tokens budget. For chat, this wastes capacity and causes
//   truncation. gemini-2.0-flash-lite has no thinking overhead, is faster
//   and perfect for conversational use.
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const GROQ_MODEL_FALLBACK = "llama-3.1-8b-instant"; // 500k TPD, no thinking overhead

const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Single model — gemini-2.5-flash works for both chat and analysis
// (gemini-2.0-flash-lite and gemini-2.0-flash unavailable for new accounts)
const GEMINI_MODEL_LITE = "gemini-2.5-flash"; // streaming chat
const GEMINI_MODEL_FULL = "gemini-2.5-flash"; // complex analysis

export const AI_MODEL = GEMINI_MODEL_FULL;
export const AI_MODEL_FAST = GEMINI_MODEL_LITE;
// Human-friendly name for the UI
export const AI_MODEL_DISPLAY = "Gemini 2.5 · Flash · Disponible 24/7";

// ============================================================
// Types
// ============================================================

export interface AIResponse {
  text: string;
}

// Timeout wrapper — Vercel functions timeout at 60s, so we abort at 55s
async function withTimeout<T>(promise: Promise<T>, ms = 55000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(Object.assign(new Error('AI request timed out'), { status: 504 })), ms)
  );
  return Promise.race([promise, timeout]);
}

// Helper: Gemini primary, Groq 8b fallback. Retries once on transient errors.
async function callWithFallback(
  geminiCall: () => Promise<any>,
  groqFallbackCall: () => Promise<any>
): Promise<any> {
  try {
    return await withTimeout(geminiCall());
  } catch (e: any) {
    const status = e?.status ?? 0;
    // Retry once on transient server errors before falling back to Groq
    if (status === 503 || status === 500 || status === 504) {
      console.warn(`[AI] Gemini transient error ${status}, retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      try {
        return await withTimeout(geminiCall());
      } catch (e2: any) {
        const s2 = e2?.status ?? 0;
        if (s2 === 429 || s2 === 400 || s2 === 404 || s2 === 500 || s2 === 503 || s2 === 504) {
          console.warn(`[AI] Gemini retry also failed (${s2}), falling back to Groq 8b`);
          return await groqFallbackCall();
        }
        throw e2;
      }
    }
    if (status === 429 || status === 400 || status === 404) {
      console.warn(`[AI] Gemini error ${status} → fallback Groq 8b`);
      return await groqFallbackCall();
    }
    throw e;
  }
}

// ============================================================
// generateAIResponse — Simple response (insights, reports, etc.)
// Uses the FULL model for maximum quality
// ============================================================

export async function generateAIResponse(options: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const { systemPrompt, userMessage, maxTokens = 8192, temperature = 0.7 } = options;

  const response = await callWithFallback(
    () =>
      gemini.chat.completions.create({
        model: GEMINI_MODEL_FULL,
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
        max_tokens: Math.min(maxTokens, 8192), // Groq 8b cap
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      })
  );

  const choice = response.choices[0];
  const text = choice?.message?.content || "";

  // Warn if response was cut off due to token limit
  if (choice?.finish_reason === "length") {
    console.warn("[AI] Response truncated (finish_reason=length). Consider increasing maxTokens.");
  }

  return { text };
}

// ============================================================
// generateChatResponse — Chat with history (no tools)
// Uses the FULL model for quality
// ============================================================

export async function generateChatResponse(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const { systemPrompt, messages, maxTokens = 8192, temperature = 0.7 } = options;

  const allMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }, ...messages];

  const response = await callWithFallback(
    () =>
      gemini.chat.completions.create({
        model: GEMINI_MODEL_FULL,
        max_tokens: maxTokens,
        temperature,
        messages: allMessages,
      }),
    () =>
      groq.chat.completions.create({
        model: GROQ_MODEL_FALLBACK,
        max_tokens: Math.min(maxTokens, 8192),
        temperature,
        messages: allMessages,
      })
  );

  const choice = response.choices[0];
  if (choice?.finish_reason === "length") {
    console.warn("[AI] Chat response truncated. Increase maxTokens.");
  }

  return { text: choice?.message?.content || "" };
}

// ============================================================
// streamChatResponse — Streaming SSE (education-chat, etc.)
// Uses the LITE model: no thinking tokens = full token budget
// for the actual response, faster streaming.
// ============================================================

export async function streamChatResponse(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  const { systemPrompt, messages, maxTokens = 4096, temperature = 0.7 } = options;

  const allMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }, ...messages];

  try {
    return await gemini.chat.completions.create({
      model: GEMINI_MODEL_LITE,
      max_tokens: maxTokens,
      temperature,
      messages: allMessages,
      stream: true,
    });
  } catch (e: any) {
    if (
      e?.status !== 429 &&
      e?.status !== 400 &&
      e?.status !== 404 &&
      e?.status !== 503
    )
      throw e;
    console.warn("[AI] Gemini stream error", e.status, "→ fallback Groq 8b");
  }

  return await groq.chat.completions.create({
    model: GROQ_MODEL_FALLBACK,
    max_tokens: Math.min(maxTokens, 8192),
    temperature,
    messages: allMessages,
    stream: true,
  });
}

// ============================================================
// chatWithTools — Full chat with tool-calling + streaming final
// Tool-calling phase: LITE model (fast, no thinking overhead)
// Final streaming response: LITE model (complete, no truncation)
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
    // Tool calls use a lower budget (still plenty for tool selection)
    // Final response gets full budget — set via streamFinal path
    maxTokens = 4096,
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

  // Tool-calling uses LITE model for speed (no thinking overhead)
  const callAI = async (msgs: any[], toolsList: any[]) => {
    try {
      return await gemini.chat.completions.create({
        model: GEMINI_MODEL_LITE,
        max_tokens: maxTokens,
        temperature,
        messages: msgs,
        tools: toolsList.length > 0 ? toolsList : undefined,
        tool_choice: toolsList.length > 0 ? "auto" : undefined,
        stream: false,
      });
    } catch (e: any) {
      if (
        e?.status !== 429 &&
        e?.status !== 400 &&
        e?.status !== 404 &&
        e?.status !== 503 &&
        e?.status !== 500
      )
        throw e;
      console.warn("[AI] Gemini tools error", e.status, "→ fallback Groq 8b");
    }
    return await groq.chat.completions.create({
      model: GROQ_MODEL_FALLBACK,
      max_tokens: Math.min(maxTokens, 8192),
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
        console.warn(
          `Failed to parse tool arguments for ${toolCall.function.name}:`,
          toolCall.function.arguments
        );
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
    // Final streaming response: use LITE for no thinking overhead + full token budget
    const STREAM_MAX_TOKENS = 8192;
    try {
      return await gemini.chat.completions.create({
        model: GEMINI_MODEL_LITE,
        max_tokens: STREAM_MAX_TOKENS,
        temperature,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: msgHistory as any,
        stream: true,
      });
    } catch (e: any) {
      if (
        e?.status !== 429 &&
        e?.status !== 400 &&
        e?.status !== 404 &&
        e?.status !== 503 &&
        e?.status !== 500
      )
        throw e;
      console.warn("[AI] Gemini streamFinal error", e.status, "→ fallback Groq 8b");
    }
    return await groq.chat.completions.create({
      model: GROQ_MODEL_FALLBACK,
      max_tokens: 8192,
      temperature,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: msgHistory as any,
      stream: true,
    });
  }

  const text = response.choices[0]?.message?.content || "";
  return { text };
}
