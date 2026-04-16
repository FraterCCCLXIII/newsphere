/** In-app reader URL: `l` = article URL, `c` = optional feed column id for prev/next within source. */
export function buildReaderUrl(link: string, columnId?: string): string {
  const p = new URLSearchParams();
  p.set("l", link);
  if (columnId) p.set("c", columnId);
  return `/reader?${p.toString()}`;
}
