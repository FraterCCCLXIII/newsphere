import { safeHttpHref } from "@/lib/safe-url";

/** In-app reader URL: `l` = article URL, `c` = optional feed column id for prev/next within source. Omits `l` when the link is not a safe http(s) URL. */
export function buildReaderUrl(link: string, columnId?: string): string {
  const safe = safeHttpHref(link);
  const p = new URLSearchParams();
  if (safe) p.set("l", safe);
  if (columnId) p.set("c", columnId);
  const q = p.toString();
  return q ? `/reader?${q}` : "/reader";
}
