/**
 * Planned surface for model "tools" (function calling) and prompt hints.
 * Client today: links in markdown + system prompt (see buildAssistantCapabilitiesPrompt).
 * Later: wire OpenAI/Anthropic tool_calls to these handlers + navigate().
 */
export const AI_TOOL_NAMES = {
  /** Open in-app reader for an article URL; optional column id for prev/next. */
  openReader: "open_reader",
  /** In-app route, e.g. /feed, /settings/app */
  openAppRoute: "open_app_route",
  /** https URL → system browser (Tauri) or new tab (web) */
  openExternal: "open_external",
} as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[keyof typeof AI_TOOL_NAMES];
