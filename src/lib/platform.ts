/** Target OS for layout (Tauri env when set, otherwise `navigator`). */
export function currentPlatform(): string | undefined {
  const env = import.meta.env.TAURI_PLATFORM;
  if (typeof env === "string" && env.length > 0) {
    return env;
  }
  if (typeof navigator === "undefined") return undefined;
  if (navigator.platform.startsWith("Mac")) return "darwin";
  if (navigator.platform.startsWith("Win")) return "windows";
  if (navigator.platform === "Linux") return "linux";
  return undefined;
}

/** Window controls on the leading edge (macOS) vs trailing (Windows/Linux). */
export function controlsOnLeft(): boolean {
  return currentPlatform() === "darwin";
}

export function isMac(): boolean {
  return currentPlatform() === "darwin";
}
