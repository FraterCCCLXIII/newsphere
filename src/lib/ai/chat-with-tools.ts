import { AGENT_TOOL_DEFINITIONS } from "@/lib/ai/agent-tool-definitions";
import type { ChatMessage } from "@/lib/ai/llm-client";
import type { AiLlmConfig } from "@/types/ai-tools";

const MAX_TOOL_ROUNDS = 10;

function trimBase(u: string): string {
  return u.trim().replace(/\/+$/, "");
}

function openAiCompatibleChatUrl(baseUrl: string): string {
  const b = trimBase(baseUrl || "https://api.openai.com/v1");
  if (b.endsWith("/chat/completions")) return b;
  if (b.endsWith("/v1")) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

function anthropicMessagesUrl(baseUrl: string): string {
  const b = trimBase(baseUrl || "https://api.anthropic.com");
  if (b.endsWith("/messages")) return b;
  return `${b}/v1/messages`;
}

type OpenAiMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenAiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

async function openAiCompatibleToolLoop(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  executeTool: (name: string, args: string) => Promise<string>,
): Promise<string> {
  const url = openAiCompatibleChatUrl(config.baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  }

  const apiMessages: OpenAiMsg[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body = {
      model: config.model,
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...apiMessages,
      ],
      tools: AGENT_TOOL_DEFINITIONS,
      tool_choice: "auto" as const,
    };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(rawText || `HTTP ${res.status}`);
    }
    const json = JSON.parse(rawText) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: OpenAiToolCall[];
        };
      }>;
      error?: { message?: string };
    };
    if (json.error?.message) throw new Error(json.error.message);
    const msg = json.choices?.[0]?.message;
    if (!msg) throw new Error("Empty response from model");

    const toolCalls = msg.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      apiMessages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: toolCalls,
      });
      for (const tc of toolCalls) {
        const name = tc.function?.name ?? "";
        const args = tc.function?.arguments ?? "{}";
        let result: string;
        try {
          result = await executeTool(name, args);
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          result = JSON.stringify({ error: err });
        }
        apiMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    const text = msg.content;
    if (typeof text === "string" && text.trim()) {
      return text;
    }
    throw new Error("Model returned no text and no tool calls");
  }
  throw new Error("Tool loop exceeded maximum rounds");
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMsg = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};

async function anthropicToolLoop(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  executeTool: (name: string, args: string) => Promise<string>,
): Promise<string> {
  const url = anthropicMessagesUrl(config.baseUrl);
  if (!config.apiKey.trim()) {
    throw new Error("Anthropic requires an API key");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": config.apiKey.trim(),
    "anthropic-version": "2023-06-01",
  };

  const anthropicTools = AGENT_TOOL_DEFINITIONS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  const apiMessages: AnthropicMsg[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body = {
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      tools: anthropicTools,
      messages: apiMessages,
    };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(rawText || `HTTP ${res.status}`);
    }
    const json = JSON.parse(rawText) as {
      content?: AnthropicContentBlock[];
      stop_reason?: string;
      error?: { message?: string };
    };
    if (json.error?.message) throw new Error(json.error.message);
    const blocks = json.content ?? [];
    const textParts = blocks.filter((b) => b.type === "text") as {
      type: "text";
      text: string;
    }[];
    const toolUses = blocks.filter((b) => b.type === "tool_use") as {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }[];

    if (toolUses.length > 0) {
      apiMessages.push({ role: "assistant", content: blocks });
      const toolResults: AnthropicContentBlock[] = [];
      for (const tu of toolUses) {
        const argsJson = JSON.stringify(tu.input ?? {});
        let result: string;
        try {
          result = await executeTool(tu.name, argsJson);
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          result = JSON.stringify({ error: err });
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result,
        });
      }
      apiMessages.push({ role: "user", content: toolResults });
      continue;
    }

    const text = textParts.map((t) => t.text).join("");
    if (text.trim()) return text;
    throw new Error("Anthropic returned no text and no tool use");
  }
  throw new Error("Anthropic tool loop exceeded maximum rounds");
}

type GeminiPart = Record<string, unknown>;

async function geminiToolLoop(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  executeTool: (name: string, args: string) => Promise<string>,
): Promise<string> {
  if (!config.apiKey.trim()) {
    throw new Error("Google Gemini requires an API key");
  }
  const model = encodeURIComponent(config.model.trim());
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const functionDeclarations = AGENT_TOOL_DEFINITIONS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));

  const transcript = messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n");

  const contents: { role: string; parts: GeminiPart[] }[] = [
    { role: "user", parts: [{ text: transcript }] },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const url = `${apiUrl}?key=${encodeURIComponent(config.apiKey.trim())}`;
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools: [{ functionDeclarations }],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(rawText || `HTTP ${res.status}`);
    }
    const json = JSON.parse(rawText) as {
      candidates?: { content?: { parts?: GeminiPart[] } }[];
      error?: { message?: string };
    };
    if (json.error?.message) throw new Error(json.error.message);
    const parts = json.candidates?.[0]?.content?.parts ?? [];

    const fnRaw = parts.find((p) => p && typeof p === "object" && "functionCall" in p) as
      | { functionCall: { name: string; args?: Record<string, unknown> } }
      | undefined;

    const text = parts
      .map((p) => {
        if (p && typeof p === "object" && "text" in p && typeof (p as { text?: string }).text === "string") {
          return (p as { text: string }).text;
        }
        return "";
      })
      .join("");

    if (fnRaw?.functionCall?.name) {
      const name = fnRaw.functionCall.name;
      const argsJson = JSON.stringify(fnRaw.functionCall.args ?? {});
      let result: string;
      try {
        result = await executeTool(name, argsJson);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        result = JSON.stringify({ error: err });
      }
      contents.push({ role: "model", parts });
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name,
              response: { result },
            },
          },
        ],
      });
      continue;
    }

    if (text.trim()) return text;
    throw new Error("Gemini returned no text and no function call");
  }
  throw new Error("Gemini tool loop exceeded maximum rounds");
}

/**
 * Runs chat with tool use (feed cache, reader, bookmarks, navigation, optional web search).
 */
export async function completeChatWithAgentTools(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  executeTool: (name: string, args: string) => Promise<string>,
): Promise<string> {
  switch (config.provider) {
    case "openai":
    case "openaiCompatible":
      return openAiCompatibleToolLoop(config, systemPrompt, messages, executeTool);
    case "anthropic":
      return anthropicToolLoop(config, systemPrompt, messages, executeTool);
    case "google":
      return geminiToolLoop(config, systemPrompt, messages, executeTool);
    default: {
      const _e: never = config.provider;
      return _e;
    }
  }
}
