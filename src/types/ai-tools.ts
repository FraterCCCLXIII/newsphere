export type LlmProviderKind =
  | "openai"
  | "anthropic"
  | "google"
  | "openaiCompatible";

export type AiLlmConfig = {
  provider: LlmProviderKind;
  /** Optional for many local stacks; required for hosted APIs. */
  apiKey: string;
  /** Base URL (trailing slashes stripped). Meaning depends on provider. */
  baseUrl: string;
  model: string;
};

export type AiToolsPersisted = {
  enabled: boolean;
  llm: AiLlmConfig;
};

export const DEFAULT_LLM_BY_PROVIDER: Record<LlmProviderKind, AiLlmConfig> = {
  openai: {
    provider: "openai",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  anthropic: {
    provider: "anthropic",
    apiKey: "",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
  },
  google: {
    provider: "google",
    apiKey: "",
    baseUrl: "",
    model: "gemini-2.0-flash",
  },
  openaiCompatible: {
    provider: "openaiCompatible",
    apiKey: "",
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3.2",
  },
};

export function defaultLlmForProvider(
  provider: LlmProviderKind,
): AiLlmConfig {
  return { ...DEFAULT_LLM_BY_PROVIDER[provider] };
}
