import { openUrl } from "@tauri-apps/plugin-opener";

import { isTauriRuntime } from "@/lib/tauri-env";
import { safeHttpHref } from "@/lib/safe-url";

/** Open a URL in the system browser (Tauri) or a new tab / same-document navigation (web). */
export async function openExternalUrl(raw: string): Promise<void> {
  const t = raw.trim();
  if (!t) return;

  const http = safeHttpHref(t);
  if (http) {
    if (isTauriRuntime()) {
      await openUrl(http);
    } else {
      window.open(http, "_blank", "noopener,noreferrer");
    }
    return;
  }

  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return;
  }

  const okScheme =
    u.protocol === "mailto:" ||
    u.protocol === "sms:" ||
    u.protocol === "tel:";

  if (!okScheme) return;

  if (isTauriRuntime()) {
    await openUrl(t);
  } else if (u.protocol === "mailto:" || u.protocol === "sms:") {
    window.location.assign(t);
  } else {
    window.open(t, "_blank", "noopener,noreferrer");
  }
}
