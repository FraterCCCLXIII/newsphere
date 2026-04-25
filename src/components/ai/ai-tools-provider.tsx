import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export type AiChatSession = {
  id: string;
  messages: UiChatMessage[];
};

type AiChatState = {
  sessions: AiChatSession[];
  activeId: string;
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
  /** Messages for the active session only. */
  messages: UiChatMessage[];
  chatSessions: AiChatSession[];
  activeChatSessionId: string;
  setActiveChatSession: (id: string) => void;
  addChatSession: () => void;
  closeChatSession: (id: string) => void;
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

  useEffect(() => {
    if (!persistence.ready || persistence.enabled) return;
    setDrawerOpen(false);
  }, [persistence.ready, persistence.enabled]);
  const [chat, setChat] = useState<AiChatState>(() => {
    const id = crypto.randomUUID();
    return { sessions: [{ id, messages: [] }], activeId: id };
  });
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const [pendingForSessionId, setPendingForSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<{
    sessionId: string;
    message: string;
  } | null>(null);

  const { sessions, activeId } = chat;
  const messages = useMemo(
    () => sessions.find((s) => s.id === activeId)?.messages ?? [],
    [sessions, activeId],
  );
  const activeSessionIdRef = useRef(activeId);
  activeSessionIdRef.current = activeId;

  const pending = pendingForSessionId === activeId;
  const error =
    sessionError?.sessionId === activeId ? sessionError.message : null;

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

  const setActiveChatSession = useCallback((id: string) => {
    setChat((c) => (c.sessions.some((s) => s.id === id) ? { ...c, activeId: id } : c));
  }, []);

  const addChatSession = useCallback(() => {
    setChat((c) => {
      const newId = crypto.randomUUID();
      return {
        sessions: [...c.sessions, { id: newId, messages: [] }],
        activeId: newId,
      };
    });
  }, []);

  const closeChatSession = useCallback((id: string) => {
    setPendingForSessionId((cur) => (cur === id ? null : cur));
    setSessionError((e) => (e?.sessionId === id ? null : e));
    setChat((c) => {
      if (c.sessions.length <= 1) {
        const newId = crypto.randomUUID();
        return { sessions: [{ id: newId, messages: [] }], activeId: newId };
      }
      const nextSessions = c.sessions.filter((s) => s.id !== id);
      let nextActive = c.activeId;
      if (c.activeId === id) {
        const removedIndex = c.sessions.findIndex((s) => s.id === id);
        nextActive = nextSessions[Math.min(removedIndex, nextSessions.length - 1)]!.id;
      }
      return { sessions: nextSessions, activeId: nextActive };
    });
  }, []);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !persistence.enabled) return;

      const targetSessionId = activeSessionIdRef.current;
      const userMsg: UiChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      // Never start async work inside a React state updater: Strict Mode can double-run it.
      const current = chatRef.current.sessions.find((s) => s.id === targetSessionId);
      if (!current) return;
      const nextHistory = [...current.messages, userMsg];
      setChat((c) => ({
        ...c,
        sessions: c.sessions.map((s) =>
          s.id === targetSessionId ? { ...s, messages: nextHistory } : s,
        ),
      }));

      setSessionError((e) => (e?.sessionId === targetSessionId ? null : e));
      setPendingForSessionId(targetSessionId);
      try {
        const reply = await runAssistant(nextHistory);
        const assistantMsg: UiChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
        };
        setChat((c) => {
          if (!c.sessions.some((s) => s.id === targetSessionId)) return c;
          return {
            ...c,
            sessions: c.sessions.map((s) =>
              s.id === targetSessionId
                ? { ...s, messages: [...nextHistory, assistantMsg] }
                : s,
            ),
          };
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setSessionError({ sessionId: targetSessionId, message: msg });
      } finally {
        setPendingForSessionId((cur) => (cur === targetSessionId ? null : cur));
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

  const clearError = useCallback(() => setSessionError(null), []);

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
      chatSessions: sessions,
      activeChatSessionId: activeId,
      setActiveChatSession,
      addChatSession,
      closeChatSession,
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
      sessions,
      activeId,
      setActiveChatSession,
      addChatSession,
      closeChatSession,
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
