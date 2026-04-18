import type { AiLlmConfig } from "@/types/ai-tools";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function trimBase(u: string): string {
  return u.trim().replace(/\/+$/, "");
}

/** Chat completions URL for OpenAI-compatible servers. */
function openAiCompatibleChatUrl(baseUrl: string): string {
  const b = trimBase(baseUrl || "https://api.openai.com/v1");
  if (b.endsWith("/chat/completions")) return b;
  if (b.endsWith("/v1")) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

/** Anthropic Messages API URL. */
function anthropicMessagesUrl(baseUrl: string): string {
  const b = trimBase(baseUrl || "https://api.anthropic.com");
  if (b.endsWith("/messages")) return b;
  return `${b}/v1/messages`;
}

async function chatOpenAiCompatible(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const url = openAiCompatibleChatUrl(config.baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  }
  const body = {
    model: config.model,
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (json.error?.message) throw new Error(json.error.message);
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Empty response from model");
  return text;
}

async function chatAnthropic(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
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
  const body = {
    model: config.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
    error?: { message?: string };
  };
  if (json.error?.message) throw new Error(json.error.message);
  const block = json.content?.find((c) => c.type === "text");
  const text = block?.text;
  if (typeof text !== "string") throw new Error("Empty response from model");
  return text;
}

async function chatGemini(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  if (!config.apiKey.trim()) {
    throw new Error("Google Gemini requires an API key");
  }
  const model = encodeURIComponent(config.model.trim());
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey.trim())}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (json.error?.message) throw new Error(json.error.message);
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text.trim()) throw new Error("Empty response from model");
  return text;
}

export async function completeChat(
  config: AiLlmConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  switch (config.provider) {
    case "openai":
    case "openaiCompatible":
      return chatOpenAiCompatible(config, systemPrompt, messages);
    case "anthropic":
      return chatAnthropic(config, systemPrompt, messages);
    case "google":
      return chatGemini(config, systemPrompt, messages);
    default: {
      const _exhaustive: never = config.provider;
      return _exhaustive;
    }
  }
}
