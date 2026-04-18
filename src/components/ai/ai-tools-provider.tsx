import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
import {
  completeChat,
  type ChatMessage as LlmChatMessage,
} from "@/lib/ai/llm-client";
import { buildFullSystemPrompt } from "@/lib/ai/rag-prompt";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";
import type { AiLlmConfig, LlmProviderKind } from "@/types/ai-tools";

import { AiFloatingComposer } from "@/components/ai/ai-floating-composer";

export type UiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AiToolsContextValue = {
  ready: boolean;
  aiToolsEnabled: boolean;
  setAiToolsEnabled: (v: boolean) => void;
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
};

export function AiToolsProvider({
  children,
  feedItemsByColumnId,
  columns,
}: AiToolsProviderProps) {
  const persistence = useAiToolsPersistence();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
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
      return completeChat(persistence.llm, systemPrompt, chat);
    },
    [searchBundle, persistence.llm],
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

      setMessages((prev) => {
        const nextHistory = [...prev, userMsg];
        void (async () => {
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
        })();
        return nextHistory;
      });
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
    <AiToolsContext.Provider value={value}>
      {children}
      <AiFloatingComposer />
    </AiToolsContext.Provider>
  );
}
