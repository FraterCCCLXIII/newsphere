/**
 * Builds `src/data/default-grid-config.json` from `public/catalog-sources.json`
 * using the layout described in `docs/default-layout-template.md` (News + Tech pages,
 * section headers, stable column ids).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public", "catalog-sources.json");
const outPath = path.join(root, "src", "data", "default-grid-config.json");

const recipe = {
  pages: [
    {
      id: "page-news",
      name: "News",
      columns: [
        {
          id: "e10c9799-b135-4c01-b25d-bae520f6de42",
          title: "Headlines",
          kind: "header",
        },
        { catalogId: "bbc-top", columnId: "379c4c84-59a6-4163-9fe8-11f4a2568690" },
        { catalogId: "guardian-world", columnId: "c7360603-e56b-4634-b868-f267b142047d" },
        { catalogId: "npr-news", columnId: "202af096-f6c0-4040-81cb-f1de5a862479" },
        {
          id: "daa49d6d-c435-4c88-8684-8fe8829e7174",
          title: "More world",
          kind: "header",
        },
        { catalogId: "aljazeera", columnId: "bae3f145-588d-4c24-b16d-21b60d8899a3" },
      ],
    },
    {
      id: "page-tech",
      name: "Tech",
      columns: [
        {
          id: "9c137e44-6968-45ec-8e1b-e04f4a4055c1",
          title: "Aggregators",
          kind: "header",
        },
        { catalogId: "hn", columnId: "cc766776-4cbe-4612-9041-230e05ea04f8" },
        { catalogId: "lobsters", columnId: "81354c0e-395f-4d75-babe-d87e869f4d2e" },
        {
          id: "9b1039b0-7ca1-464d-b279-2abe0c2a543d",
          title: "Tech news",
          kind: "header",
        },
        { catalogId: "ars", columnId: "d064c4bb-e11f-4aa1-aba1-6a355cbcb90f" },
        { catalogId: "verge", columnId: "be4225c2-0f48-4edf-8476-99f962f3cf90" },
        { catalogId: "wired", columnId: "3d2e7478-42cd-4f07-808a-3a2c536c76c0" },
      ],
    },
  ],
  activePageId: "page-news",
};

function loadCatalog() {
  const raw = fs.readFileSync(catalogPath, "utf8");
  const list = JSON.parse(raw);
  const byId = new Map();
  for (const entry of list) {
    if (entry && typeof entry.id === "string") {
      byId.set(entry.id, entry);
    }
  }
  return byId;
}

function buildGridConfig(byId) {
  const pages = recipe.pages.map((page) => ({
    id: page.id,
    name: page.name,
    columns: page.columns.map((col) => {
      if ("catalogId" in col) {
        const src = byId.get(col.catalogId);
        if (!src) {
          throw new Error(`Missing catalog id "${col.catalogId}" in ${catalogPath}`);
        }
        if (!src.url || typeof src.url !== "string") {
          throw new Error(`Invalid url for catalog id "${col.catalogId}"`);
        }
        return {
          id: col.columnId,
          title: src.name,
          kind: "feed",
          feedUrl: src.url,
        };
      }
      return { ...col };
    }),
  }));

  return {
    pages,
    activePageId: recipe.activePageId,
  };
}

const byId = loadCatalog();
const config = buildGridConfig(byId);
fs.writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outPath)} (${config.pages.length} pages)`);
