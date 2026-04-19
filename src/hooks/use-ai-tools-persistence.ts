import { useCallback, useEffect, useMemo, useState } from "react";

import { isTauriRuntime } from "@/lib/tauri-env";
import {
  defaultLlmForProvider,
  type AiLlmConfig,
  type AiToolsPersisted,
  type LlmProviderKind,
} from "@/types/ai-tools";

const STORE_FILE = "ai-tools.json";
const STORE_KEY = "ai_tools_data";
const LS_KEY = "newsphere-ai-tools-v1";

const TAURI_OPTIONS = { defaults: {}, autoSave: true } as const;

let storePromise: ReturnType<
  typeof import("@tauri-apps/plugin-store").load
> | null = null;

let saveTail: Promise<void> = Promise.resolve();

function enqueuePersist(task: () => Promise<void>): Promise<void> {
  saveTail = saveTail.then(task);
  return saveTail;
}

async function getStore() {
  if (!storePromise) {
    const { load } = await import("@tauri-apps/plugin-store");
    storePromise = load(STORE_FILE, TAURI_OPTIONS);
  }
  return storePromise;
}

function defaultPersisted(): AiToolsPersisted {
  return {
    enabled: false,
    llm: defaultLlmForProvider("openaiCompatible"),
    webSearchEnabled: false,
  };
}

function isProvider(p: unknown): p is LlmProviderKind {
  return (
    p === "openai" ||
    p === "anthropic" ||
    p === "google" ||
    p === "openaiCompatible"
  );
}

/** Merge partial stored llm with defaults so a bad field doesn’t drop the whole config. */
function parseLlm(raw: unknown): AiLlmConfig {
  const fallback = defaultLlmForProvider("openaiCompatible");
  if (!raw || typeof raw !== "object") return fallback;
  const l = raw as Record<string, unknown>;
  const provider = l.provider;
  const base = isProvider(provider)
    ? defaultLlmForProvider(provider)
    : fallback;
  const apiKey = typeof l.apiKey === "string" ? l.apiKey : "";
  const baseUrl = typeof l.baseUrl === "string" ? l.baseUrl : base.baseUrl;
  const model =
    typeof l.model === "string" && l.model.trim()
      ? l.model.trim()
      : base.model;
  return {
    provider: isProvider(provider) ? provider : base.provider,
    apiKey,
    baseUrl,
    model,
  };
}

function parseEnabledFlag(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
  }
  return false;
}

function parsePersisted(raw: unknown): AiToolsPersisted {
  if (!raw || typeof raw !== "object") {
    return defaultPersisted();
  }
  const o = raw as Record<string, unknown>;
  const enabled = parseEnabledFlag(o.enabled);
  const llm = parseLlm(o.llm);
  const webSearchEnabled = parseEnabledFlag(o.webSearchEnabled);
  return { enabled, llm, webSearchEnabled };
}

async function loadPersisted(): Promise<AiToolsPersisted> {
  if (isTauriRuntime()) {
    try {
      const store = await getStore();
      const value = await store.get<unknown>(STORE_KEY);
      return parsePersisted(value);
    } catch {
      return defaultPersisted();
    }
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      return parsePersisted(JSON.parse(raw) as unknown);
    }
  } catch {
    /* ignore */
  }
  return defaultPersisted();
}

async function savePersisted(data: AiToolsPersisted): Promise<void> {
  if (isTauriRuntime()) {
    await enqueuePersist(async () => {
      const store = await getStore();
      await store.set(STORE_KEY, data);
      await store.save();
    });
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export type AiToolsPersistence = {
  ready: boolean;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (v: boolean) => void;
  llm: AiLlmConfig;
  setLlm: (v: AiLlmConfig | ((prev: AiLlmConfig) => AiLlmConfig)) => void;
  setProvider: (provider: LlmProviderKind) => void;
};

export function useAiToolsPersistence(): AiToolsPersistence {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [llm, setLlmState] = useState<AiLlmConfig>(() =>
    defaultLlmForProvider("openaiCompatible"),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await loadPersisted();
        if (cancelled) return;
        setEnabled(data.enabled);
        setWebSearchEnabled(data.webSearchEnabled ?? false);
        setLlmState(data.llm);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void savePersisted({ enabled, llm, webSearchEnabled });
  }, [ready, enabled, llm, webSearchEnabled]);

  const setLlm = useCallback(
    (v: AiLlmConfig | ((prev: AiLlmConfig) => AiLlmConfig)) => {
      setLlmState((prev) => (typeof v === "function" ? v(prev) : v));
    },
    [],
  );

  const setProvider = useCallback((provider: LlmProviderKind) => {
    setLlmState((prev) => {
      const base = defaultLlmForProvider(provider);
      return { ...base, apiKey: prev.apiKey };
    });
  }, []);

  return useMemo(
    () => ({
      ready,
      enabled,
      setEnabled,
      webSearchEnabled,
      setWebSearchEnabled,
      llm,
      setLlm,
      setProvider,
    }),
    [ready, enabled, setEnabled, webSearchEnabled, llm, setLlm, setProvider],
  );
}
