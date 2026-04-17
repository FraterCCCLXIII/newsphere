# Default pages, sections, and feeds (build template)

This document is the **authoring template** for two kinds of data the app understands:

1. **Feed catalog** — the library of RSS/Atom sources users can pick from.
2. **Grid layout** — pages, section headers, and feed columns (what appears on the home grid and in Settings).

It matches the shapes used in `src/types/catalog.ts`, `src/types/grid.ts`, and `src/hooks/use-grid-config.ts`.

---

## What ships when the app builds

| Artifact | Location | Included in build? | Role |
|----------|----------|--------------------|------|
| Feed catalog | `public/catalog-sources.json` | **Yes** — Vite copies everything under `public/` into the build output root (e.g. `dist/catalog-sources.json`). | Loaded at runtime via `loadCatalogSources()` in `src/data/catalog-sources.ts`. |
| User grid state | Tauri store `grid-config.json` key `grid_config`, or web `localStorage` | **No** — per device, not part of the static bundle. | Persisted after the user changes layout. |
| Bundled default grid | `src/data/default-grid-config.json` | **Yes** — imported in the bundle | **First launch** (no saved grid): multiple pages (**News**, **Tech**, **Business**, **Science**, **Culture**, **Sports**, **Ideas**, **Philosophy**, **Spirituality**) with section headers and feeds. `migrateGridConfig()` in `use-grid-config.ts` falls back to this when `grid_config` / localStorage is missing. Regenerate from the catalog via `npm run generate:default-grid`. |

Edit **`src/data/default-grid-config.json`** to change the out-of-the-box layout. The **Grid layout JSON** section below documents the same shape for reference.

---

## 1. Feed catalog (`CatalogSource[]`)

Each entry is one row in the catalog picker.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `id` | string | ✓ | Stable id (slug). Unique across the file. |
| `name` | string | ✓ | Display name. |
| `url` | string | ✓ | RSS or Atom feed URL. |
| `category` | string | ✓ | Group label in the catalog UI (e.g. `Tech`, `News`). |

### Template (minimal)

```json
[
  {
    "id": "example-feed",
    "name": "Example Site",
    "url": "https://example.com/feed.xml",
    "category": "Tech"
  }
]
```

### Validation

`parseCatalogSources()` skips invalid objects. Every field must be a non-empty string after trim.

---

## 2. Grid layout (`GridConfig`)

Persisted shape for pages and columns. **Not** the same as the catalog: columns store a **display title** and optional **`feedUrl`** (the actual subscription URL).

### Top level

| Field | Type | Notes |
|-------|------|--------|
| `pages` | `GridPage[]` | Ordered list of named pages (tabs in the UI). |
| `activePageId` | string | Which page is selected. Use `page-news` for the first page, or another page’s `id`. Must exist in `pages`. **Do not** use `page-all-aggregate` here — that id is virtual and not stored. |

### `GridPage`

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Unique. The first page in the app’s empty default uses **`page-news`** (`DEFAULT_FIRST_PAGE_ID`). Additional pages often use random UUIDs when created in-app; you may use stable slugs like `page-tech` if you control the file. |
| `name` | string | Tab label (e.g. `News`, `Tech`). |
| `columns` | `GridColumn[]` | Order = order on the grid / in Settings. |

### `GridColumn`

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Unique among all columns (across pages). Prefer `crypto.randomUUID()`-style ids when generating; any unique string works. |
| `title` | string | Column title shown in the UI. |
| `kind` | `"feed"` \| `"header"` | Optional; omit or `"feed"` for RSS columns. `"header"` = full-width **section** label (organizes feeds below it). |
| `feedUrl` | string | Required for feed columns: must match a working RSS/Atom URL (often the same as a catalog `url`). Omit for headers. |

### Section headers vs feeds

- **`kind: "header"`** — Section title row; no `feedUrl`.
- **Feed column** — `kind` omitted or `"feed"`, with `feedUrl` set.

### Template (minimal)

```json
{
  "pages": [
    {
      "id": "page-news",
      "name": "News",
      "columns": []
    }
  ],
  "activePageId": "page-news"
}
```

### Template (one page with sections and feeds)

Use real `feedUrl` values (typically copied from `catalog-sources.json` or your own list). Replace column `id` values with new UUIDs when generating fresh configs. The shipped bundle uses **`src/data/default-grid-config.json`** (several pages with sections and feeds; see `scripts/generate-default-grid.mjs`).

```json
{
  "pages": [
    {
      "id": "page-news",
      "name": "News",
      "columns": [
        {
          "id": "00000000-0000-4000-8000-000000000001",
          "title": "Headlines",
          "kind": "header"
        },
        {
          "id": "00000000-0000-4000-8000-000000000002",
          "title": "BBC — Top stories",
          "kind": "feed",
          "feedUrl": "https://feeds.bbci.co.uk/news/rss.xml"
        },
        {
          "id": "00000000-0000-4000-8000-000000000003",
          "title": "Tech",
          "kind": "header"
        },
        {
          "id": "00000000-0000-4000-8000-000000000004",
          "title": "Hacker News",
          "kind": "feed",
          "feedUrl": "https://hnrss.org/frontpage"
        }
      ]
    }
  ],
  "activePageId": "page-news"
}
```

### Template (multiple pages)

```json
{
  "pages": [
    {
      "id": "page-news",
      "name": "News",
      "columns": []
    },
    {
      "id": "page-00000000-0000-4000-8000-000000000099",
      "name": "Integral",
      "columns": []
    }
  ],
  "activePageId": "page-news"
}
```

---

## 3. Legacy format (migration only)

If stored JSON has top-level `columns` but no `pages`, `migrateGridConfig()` wraps it into a single page named **News** with id **`page-news`**. Prefer the `pages` + `activePageId` shape for new content.

---

## 4. Virtual “All” page (not stored)

When there are **two or more** pages, the UI can show a combined **All** view (`AGGREGATE_PAGE_ID` = `page-all-aggregate`). That view is **not** written into `GridConfig`; it is derived at runtime. Do not add a `pages[]` entry for it.

---

## 5. Checklist when editing defaults

- [ ] Catalog: every `id` unique; URLs are feeds (RSS/Atom), not homepages.
- [ ] Grid: every `pages[].id` unique; every `columns[].id` unique globally.
- [ ] Grid: every feed column has `feedUrl`; headers have `kind: "header"` and no `feedUrl`.
- [ ] Grid: within each page, **every section** (feeds listed under one header until the next header) has a **feed count divisible by 3** (enforced by `assertSectionFeedsDivisibleByThree()` in `scripts/generate-default-grid.mjs`).
- [ ] `activePageId` matches one of `pages[].id`.
- [ ] First page id stays **`page-news`** if you want parity with `DEFAULT_FIRST_PAGE_ID` in `src/types/grid.ts`.

---

## Reference (code)

- Types: `src/types/grid.ts`, `src/types/catalog.ts`
- Persistence and bundled defaults: `src/hooks/use-grid-config.ts` + `src/data/default-grid-config.json`
- Catalog load path: `src/data/catalog-sources.ts` → `public/catalog-sources.json`
