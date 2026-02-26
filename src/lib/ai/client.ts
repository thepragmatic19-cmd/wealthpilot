import Groq from "groq-sdk";

// ============================================================
// AI Provider: Groq (Llama 3.3 70B - free, ultra fast)
// ============================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const AI_MODEL = "llama-3.3-70b-versatile";

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

  const response = await groq.chat.completions.create({
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

  const response = await groq.chat.completions.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: groqMessages,
  });

  const text = response.choices[0]?.message?.content || "";
  return { text };
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
}): Promise<AIResponse> {
  const { systemPrompt, messages, tools, executeTool, onToolCall, maxTokens = 2048, temperature = 0.7 } =
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

  let response = await groq.chat.completions.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: groqMessages,
    tools: groqTools,
    tool_choice: "auto",
  });

  let maxIterations = 5;

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
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const result = executeTool(toolCall.function.name, args);

      groqMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    // Call again with tool results
    response = await groq.chat.completions.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: groqMessages,
      tools: groqTools,
      tool_choice: "auto",
    });
  }

  const text = response.choices[0]?.message?.content || "";
  return { text };
}
