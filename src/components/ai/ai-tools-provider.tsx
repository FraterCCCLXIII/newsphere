import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAiToolsPersistence } from "@/hooks/use-ai-tools-persistence";
import {
  buildFeedSearchBundle,
  buildIndexedArticles,
  retrieveArticles,
  type FeedSearchBundle,
} from "@/lib/ai/feed-index";
import { executeAgentTool, type AgentToolContext } from "@/lib/ai/agent-tool-executor";
import { completeChatWithAgentTools } from "@/lib/ai/chat-with-tools";
import type { ChatMessage as LlmChatMessage } from "@/lib/ai/llm-client";
import { buildFullSystemPrompt } from "@/lib/ai/rag-prompt";
import type { BookmarkEntry } from "@/types/bookmark";
import type { FeedItem } from "@/types/feed";
import type { GridColumn, GridPage } from "@/types/grid";
import type { ReadHistoryEntry } from "@/types/read-history";
import type { AiLlmConfig, LlmProviderKind } from "@/types/ai-tools";

export type UiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AiToolsContextValue = {
  ready: boolean;
  aiToolsEnabled: boolean;
  setAiToolsEnabled: (v: boolean) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (v: boolean) => void;
  llm: AiLlmConfig;
  setLlm: (v: AiLlmConfig | ((prev: AiLlmConfig) => AiLlmConfig)) => void;
  setProvider: (p: LlmProviderKind) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  toggleDrawer: () => void;
  messages: UiChatMessage[];
  sendUserMessage: (text: string) => Promise<void>;
  pending: boolean;
  error: string | null;
  clearError: () => void;
  submitFromFloatingBar: (text: string) => void;
};

const AiToolsContext = createContext<AiToolsContextValue | null>(null);

export function useAiTools(): AiToolsContextValue {
  const ctx = useContext(AiToolsContext);
  if (!ctx) {
    throw new Error("useAiTools must be used within AiToolsProvider");
  }
  return ctx;
}

type AiToolsProviderProps = {
  children: ReactNode;
  feedItemsByColumnId: Record<string, FeedItem[]>;
  columns: GridColumn[];
  pages: GridPage[];
  bookmarks: BookmarkEntry[];
  readHistory: ReadHistoryEntry[];
  navigation: {
    pathname: string;
    search: string;
    navigate: (path: string) => void;
  };
};

export function AiToolsProvider({
  children,
  feedItemsByColumnId,
  columns,
  pages,
  bookmarks,
  readHistory,
  navigation,
}: AiToolsProviderProps) {
  const persistence = useAiToolsPersistence();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchBundle = useMemo<FeedSearchBundle>(() => {
    try {
      const docs = buildIndexedArticles(feedItemsByColumnId, columns);
      return buildFeedSearchBundle(docs);
    } catch {
      return { index: null, byId: new Map() };
    }
  }, [feedItemsByColumnId, columns]);

  const toolContext = useMemo<AgentToolContext>(
    () => ({
      feedItemsByColumnId,
      columns,
      pages,
      bookmarks,
      readHistory,
      pathname: navigation.pathname,
      search: navigation.search,
      navigate: navigation.navigate,
      webSearchEnabled: persistence.webSearchEnabled,
    }),
    [
      feedItemsByColumnId,
      columns,
      pages,
      bookmarks,
      readHistory,
      navigation.pathname,
      navigation.search,
      navigation.navigate,
      persistence.webSearchEnabled,
    ],
  );

  const executeTool = useCallback(
    async (name: string, args: string) => {
      return executeAgentTool(name, args, toolContext);
    },
    [toolContext],
  );

  const runAssistant = useCallback(
    async (fullHistory: UiChatMessage[]) => {
      const chat: LlmChatMessage[] = fullHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const lastUser = [...fullHistory].reverse().find((m) => m.role === "user");
      const q = lastUser?.content ?? "";
      const articles = retrieveArticles(searchBundle, q, 8);
      const systemPrompt = buildFullSystemPrompt(articles);
      return completeChatWithAgentTools(
        persistence.llm,
        systemPrompt,
        chat,
        executeTool,
      );
    },
    [searchBundle, persistence.llm, executeTool],
  );

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !persistence.enabled) return;

      const userMsg: UiChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      // Never start async work inside setMessages: React Strict Mode double-invokes
      // updater functions in development, which would run the assistant twice.
      const nextHistory = [...messagesRef.current, userMsg];
      setMessages(nextHistory);

      setError(null);
      setPending(true);
      try {
        const reply = await runAssistant(nextHistory);
        setMessages((p) => [
          ...p,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: reply,
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setPending(false);
      }
    },
    [persistence.enabled, runAssistant],
  );

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((o) => !o);
  }, []);

  const submitFromFloatingBar = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || !persistence.enabled) return;
      setDrawerOpen(true);
      void sendUserMessage(t);
    },
    [persistence.enabled, sendUserMessage],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AiToolsContextValue>(
    () => ({
      ready: persistence.ready,
      aiToolsEnabled: persistence.enabled,
      setAiToolsEnabled: persistence.setEnabled,
      webSearchEnabled: persistence.webSearchEnabled,
      setWebSearchEnabled: persistence.setWebSearchEnabled,
      llm: persistence.llm,
      setLlm: persistence.setLlm,
      setProvider: persistence.setProvider,
      drawerOpen,
      setDrawerOpen,
      toggleDrawer,
      messages,
      sendUserMessage,
      pending,
      error,
      clearError,
      submitFromFloatingBar,
    }),
    [
      persistence.ready,
      persistence.enabled,
      persistence.setEnabled,
      persistence.webSearchEnabled,
      persistence.setWebSearchEnabled,
      persistence.llm,
      persistence.setLlm,
      persistence.setProvider,
      drawerOpen,
      toggleDrawer,
      messages,
      sendUserMessage,
      pending,
      error,
      clearError,
      submitFromFloatingBar,
    ],
  );

  return (
    <AiToolsContext.Provider value={value}>{children}</AiToolsContext.Provider>
  );
}
