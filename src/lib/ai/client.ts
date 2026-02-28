import OpenAI from "openai";

// ============================================================
// AI Provider: Google Gemini 2.0 Flash
// Via OpenAI-compatible endpoint — aucun changement dans les routes API
// Limites: 1 500 req/jour, 32 768 TPM gratuit (vs 14 400 sur Groq)
// ============================================================

const genAI = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const AI_MODEL = "gemini-2.0-flash";
export const AI_MODEL_FAST = "gemini-2.0-flash"; // même modèle — Gemini gère sa propre optimisation

// ============================================================
// Types
// ============================================================

export interface AIResponse {
  text: string;
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

  const response = await genAI.chat.completions.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

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

  const groqMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

  const response = await genAI.chat.completions.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: groqMessages,
  });

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
  }> = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

  return await genAI.chat.completions.create({
    model: AI_MODEL,
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

  // Convert tools to OpenAI function calling format
  const openAITools = tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));

  const groqMessages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
  }> = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

  const callAI = async (msgs: any[], toolsList: any[]) => {
    return await genAI.chat.completions.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: msgs,
      tools: toolsList.length > 0 ? toolsList : undefined,
      tool_choice: toolsList.length > 0 ? "auto" : undefined,
      stream: false,
    });
  };

  let response = await callAI(groqMessages, openAITools);

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
    groqMessages.push(choice.message as any);

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
    response = await callAI(groqMessages, openAITools);
  }

  if (streamFinal) {
    // Return streaming response
    return await genAI.chat.completions.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: groqMessages,
      stream: true,
    });
  }

  const text = response.choices[0]?.message?.content || "";
  return { text };
}
