import packageJson from "../../package.json";

/** User-visible application name. Keep in sync with `index.html` `<title>` and Tauri `productName`. */
export const APP_DISPLAY_NAME = "Newsphere" as const;

/** Public GitHub repository (source, issues, releases). */
export const APP_REPOSITORY_URL =
  "https://github.com/Newsphere-Project/newsphere" as const;

/** Semantic version from `package.json`. Keep in sync with `src-tauri/Cargo.toml` and `tauri.conf.json`. */
export const APP_VERSION: string = packageJson.version;
