/**
 * OpenAI-compatible tool definitions (also mapped for Anthropic / Gemini in chat-with-tools).
 */
export type OpenAiToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const AGENT_TOOL_DEFINITIONS: OpenAiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_current_reader_article",
      description:
        "If the user is viewing an article in the in-app reader (/reader), returns extracted plain text and metadata. Use when they ask about “this article” or the page they have open.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "search_feed_cache",
      description:
        "Search headlines and snippets in locally cached feed items (all columns or one column). Use for “what did my feeds say about X”.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Keywords to match in title/snippet (case-insensitive). Empty returns recent items.",
          },
          column_id: {
            type: "string",
            description:
              "Optional feed column id to limit search; omit to search all feeds.",
          },
          limit: {
            type: "integer",
            description: "Max items to return (default 15, max 40).",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_feed_columns",
      description:
        "List feed sources (columns) with ids and titles for citing or filtering.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_grid_pages",
      description:
        "List named grid pages (e.g. News, Tech) in the app layout.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bookmarks",
      description:
        "List saved bookmarks; optional query filters title/link text.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Substring filter; empty returns recent bookmarks.",
          },
          limit: { type: "integer", description: "Max entries (default 20, max 50)." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_read_history",
      description:
        "List recently opened articles from history; optional query filters title/link.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Substring filter; empty returns most recent.",
          },
          limit: { type: "integer", description: "Max entries (default 20, max 50)." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_article_plain_text",
      description:
        "Fetch and extract readable plain text from a public http(s) article URL (full body, not just the feed snippet). Use for quotes or deep analysis.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Article URL (http or https).",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_in_reader",
      description:
        "Open an article in the in-app reader UI (navigates the app). Prefer when the user wants to read a specific cached URL.",
      parameters: {
        type: "object",
        properties: {
          article_url: {
            type: "string",
            description: "Canonical article http(s) URL.",
          },
          column_id: {
            type: "string",
            description: "Optional feed column id for prev/next within that source.",
          },
        },
        required: ["article_url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description:
        "Navigate to an in-app route (e.g. /bookmarks, /history, /feed, /settings/app). Path must start with /.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "App path such as /, /feed, /bookmarks, /history, /reader?l=..., /settings/app",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Best-effort instant answers from the public web (DuckDuckGo). Only available when the user has enabled web search in Settings. Use for facts outside the user’s feeds.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
];
