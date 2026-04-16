/** True when the app runs inside Tauri (dev or production). */
export function isTauriRuntime(): boolean {
  const fromEnv =
    typeof import.meta.env.TAURI_PLATFORM === "string" &&
    import.meta.env.TAURI_PLATFORM.length > 0;
  if (fromEnv) return true;
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}
