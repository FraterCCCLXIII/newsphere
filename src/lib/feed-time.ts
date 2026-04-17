import type { PublishedDateFormatStyle } from "@/types/display-preferences";

/** Sort key: newer → larger. Missing/invalid dates sort as 0 (oldest). */
export function publishedSortKey(iso?: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Short relative label for feed timestamps (Twitter-style). */
export function formatRelativePublished(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Inline feed UI: locale date plus time (e.g. after the date). */
export function formatPublishedDateTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const t = d.getTime();
    if (!Number.isFinite(t)) return "";
    const datePart = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timePart = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} ${timePart}`;
  } catch {
    return "";
  }
}

/** Published time for feed lists per user preference (relative vs absolute). */
export function formatPublishedForPreference(
  iso: string | undefined,
  style: PublishedDateFormatStyle,
): string {
  if (style === "relative") return formatRelativePublished(iso);
  return formatPublishedDateTime(iso);
}
