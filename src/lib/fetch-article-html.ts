import { invoke } from "@tauri-apps/api/core";

import { isTauriRuntime } from "@/lib/tauri-env";
import { parseSafeHttpUrl } from "@/lib/safe-url";

/** Fetch HTML for an article URL. In Tauri, uses the native client (no CORS). In the browser, uses `fetch` (often blocked by CORS for third-party sites). */
export async function fetchArticleHtmlString(url: string): Promise<string> {
  if (!parseSafeHttpUrl(url)) {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (isTauriRuntime()) {
    return invoke<string>("fetch_article_html", { url });
  }
  const res = await fetch(url, { credentials: "omit", mode: "cors" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}
