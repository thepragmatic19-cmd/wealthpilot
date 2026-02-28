import Groq from "groq-sdk";

// ============================================================
// AI Provider: Groq
// Primary: Llama 3.3 70B (qualité CFA-grade)
// Fallback: Llama 3.1 8B Instant (haute vélocité, sans limite TPM)
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const AI_MODEL = "llama-3.3-70b-versatile";
export const AI_MODEL_FAST = "llama-3.1-8b-instant"; // Fallback si 429 TPM

// ============================================================
// Unified AI Interface
// ============================================================

interface AIResponse {
  text: string;
}

/**
 * Generate a response from the AI model (single prompt, no history).
 */
export async function generateAIResponse(options: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const { systemPrompt, userMessage, maxTokens = 2048, temperature = 0.7 } = options;

  // Try primary model first, fallback to fast model on rate limit
  for (const model of [AI_MODEL, AI_MODEL_FAST]) {
    try {
      const response = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });
      const text = response.choices[0]?.message?.content || "";
      return { text };
    } catch (error: any) {
      if (error?.status === 429 && model === AI_MODEL) {
        console.warn("[AI] Groq 429 sur modèle primaire, bascule sur modèle rapide...");
        continue; // retry with fallback
      }
      throw error;
    }
  }
  return { text: "" };
}

/**
 * Chat with conversation history.
 */
export async function generateChatResponse(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<AIResponse> {
  const { systemPrompt, messages, maxTokens = 2048, temperature = 0.7 } = options;

  const groqMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

  // Try primary model first, fallback to fast model on rate limit
  for (const model of [AI_MODEL, AI_MODEL_FAST]) {
    try {
      const response = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: groqMessages,
      });
      const text = response.choices[0]?.message?.content || "";
      return { text };
    } catch (error: any) {
      if (error?.status === 429 && model === AI_MODEL) {
        console.warn("[AI] Groq 429 sur modèle primaire, bascule sur modèle rapide...");
        continue;
      }
      throw error;
    }
  }
  return { text: "" };
}

/**
 * Stream a chat response from Groq.
 */
export async function streamChatResponse(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  const { systemPrompt, messages, maxTokens = 2048, temperature = 0.7 } = options;

  const groqMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

  return groq.chat.completions.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: groqMessages,
    stream: true,
  });
}

/**
 * Chat with tool use (function calling) support.
 * Groq supports OpenAI-compatible tool calling.
 */
export async function chatWithTools(options: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  executeTool: (name: string, args: Record<string, unknown>) => string;
  onToolCall?: (name: string) => void;
  maxTokens?: number;
  temperature?: number;
  streamFinal?: boolean;
}): Promise<AIResponse | any> {
  const { systemPrompt, messages, tools, executeTool, onToolCall, maxTokens = 2048, temperature = 0.7, streamFinal = false } =
    options;

  // Convert tools to OpenAI function calling format
  const groqTools = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groqMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const callGroq = async (msgs: any[], toolsList: any[], modelOverride?: string) => {
    const model = modelOverride || AI_MODEL;
    let attempts = 0;
    while (attempts < 3) {
      try {
        return await groq.chat.completions.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: msgs,
          tools: toolsList.length > 0 ? toolsList : undefined,
          tool_choice: toolsList.length > 0 ? "auto" : undefined,
          stream: false,
        });
      } catch (error: any) {
        if (error?.status === 429 && attempts < 2) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1500 * attempts));
          continue;
        }
        throw error;
      }
    }
  };

  let response = await callGroq(groqMessages, groqTools);
  // If primary model hits rate limit, fallback to fast model
  if (!response) {
    console.warn("[AI] callGroq primary failed, trying fast model fallback...");
    response = await callGroq(groqMessages, groqTools, AI_MODEL_FAST);
  }
  if (!response) throw new Error("Groq API: aucune réponse après 3 tentatives");

  let maxIterations = 10;

  // Handle tool calls in a loop
  while (maxIterations > 0) {
    const choice = response.choices[0];
    if (
      !choice?.message?.tool_calls ||
      choice.message.tool_calls.length === 0
    ) {
      break;
    }

    maxIterations--;

    // Add the assistant message with tool calls
    groqMessages.push(choice.message);

    // Execute each tool call and add results
    for (const toolCall of choice.message.tool_calls) {
      if (onToolCall) onToolCall(toolCall.function.name);

      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (e) {
        console.warn(`Failed to parse tool arguments for ${toolCall.function.name}:`, toolCall.function.arguments);
      }

      const result = executeTool(toolCall.function.name, args);

      groqMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    // Call again with tool results
    response = await callGroq(groqMessages, groqTools);
    if (!response) throw new Error("Groq API: aucune réponse après 3 tentatives");
  }

  if (streamFinal) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        return await groq.chat.completions.create({
          model: AI_MODEL,
          max_tokens: maxTokens,
          temperature,
          messages: groqMessages,
          stream: true,
        });
      } catch (error: any) {
        if (error?.status === 429 && attempts < 2) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1500 * attempts));
          continue;
        }
        throw error;
      }
    }
  }

  const text = response.choices[0]?.message?.content || "";
  return { text };
}
