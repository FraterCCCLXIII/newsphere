import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "newsphere-text-scale";
const STORAGE_KEY_LEGACY = "newsfeed-text-scale";
/** Multiplier applied to root font size (1 = browser default base). */
export const TEXT_SCALE_MIN = 0.85;
export const TEXT_SCALE_MAX = 1.35;
export const TEXT_SCALE_DEFAULT = 1;

function clampScale(value: number): number {
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, value));
}

function readStoredScale(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(STORAGE_KEY_LEGACY);
    if (raw === null) return null;
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) return null;
    return clampScale(n);
  } catch {
    return null;
  }
}

function getInitialScale(): number {
  return readStoredScale() ?? TEXT_SCALE_DEFAULT;
}

type TextScaleContextValue = {
  textScale: number;
  setTextScale: (scale: number) => void;
};

const TextScaleContext = createContext<TextScaleContextValue | null>(null);

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
  const [textScale, setTextScaleState] = useState<number>(getInitialScale);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--text-scale",
      String(textScale),
    );
  }, [textScale]);

  const setTextScale = useCallback((next: number) => {
    const clamped = clampScale(next);
    setTextScaleState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(STORAGE_KEY_LEGACY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ textScale, setTextScale }),
    [textScale, setTextScale],
  );

  return (
    <TextScaleContext.Provider value={value}>{children}</TextScaleContext.Provider>
  );
}

export function useTextScale(): TextScaleContextValue {
  const ctx = useContext(TextScaleContext);
  if (!ctx) {
    throw new Error("useTextScale must be used within TextScaleProvider");
  }
  return ctx;
}
