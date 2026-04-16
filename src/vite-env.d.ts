/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set when running inside Tauri (dev or production). */
  readonly TAURI_PLATFORM?: string;
  readonly TAURI_ARCH?: string;
  readonly TAURI_FAMILY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
