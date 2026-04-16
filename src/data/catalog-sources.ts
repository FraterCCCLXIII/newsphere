import type { CatalogSource } from "@/types/catalog";

/** Editable list: `public/catalog-sources.json` (copied to dist by Vite). */
function catalogSourcesHref(): string {
  return `${import.meta.env.BASE_URL}catalog-sources.json`;
}

function isCatalogSource(x: unknown): x is CatalogSource {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.trim() !== "" &&
    typeof o.name === "string" &&
    o.name.trim() !== "" &&
    typeof o.url === "string" &&
    o.url.trim() !== "" &&
    typeof o.category === "string" &&
    o.category.trim() !== ""
  );
}

/** Validates and normalizes JSON from the catalog file. */
export function parseCatalogSources(data: unknown): CatalogSource[] {
  if (!Array.isArray(data)) return [];
  const out: CatalogSource[] = [];
  for (const item of data) {
    if (!isCatalogSource(item)) continue;
    out.push({
      id: item.id.trim(),
      name: item.name.trim(),
      url: item.url.trim(),
      category: item.category.trim(),
    });
  }
  return out;
}

/** Loads curated feeds from `public/catalog-sources.json`. */
export async function loadCatalogSources(): Promise<CatalogSource[]> {
  const res = await fetch(catalogSourcesHref());
  if (!res.ok) {
    throw new Error(`Could not load catalog (${res.status})`);
  }
  const json: unknown = await res.json();
  return parseCatalogSources(json);
}

export function getCatalogCategories(sources: CatalogSource[]): string[] {
  const set = new Set<string>();
  for (const s of sources) {
    set.add(s.category);
  }
  return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
}
