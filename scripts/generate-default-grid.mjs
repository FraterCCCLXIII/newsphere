/**
 * Builds `src/data/default-grid-config.json` from `public/catalog-sources.json`.
 * Default layout: multiple pages with section headers and feeds (see docs/default-layout-template.md).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public", "catalog-sources.json");
const outPath = path.join(root, "src", "data", "default-grid-config.json");

/** Catalog ids + stable column UUIDs (unique across all pages). */
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
        { catalogId: "ap-top", columnId: "6e30ecb4-6aa3-4c14-a668-7754533714cc" },
        { catalogId: "pbs-newshour", columnId: "27e6471a-a198-4833-bc69-8333e76326fd" },
        {
          id: "431831b0-1705-48f1-a1ba-1bfab233ca22",
          title: "Politics & policy",
          kind: "header",
        },
        { catalogId: "politico", columnId: "839d0cde-88cb-429b-a51a-3818d575a276" },
        { catalogId: "axios", columnId: "999b44d0-6224-42cd-9cc0-e92c22bf42a9" },
        { catalogId: "theatlantic", columnId: "23684da2-c917-4f29-a686-6159e771e675" },
        {
          id: "daa49d6d-c435-4c88-8684-8fe8829e7174",
          title: "World & wire",
          kind: "header",
        },
        { catalogId: "reuters-top", columnId: "fa0d114a-fd10-4867-bb28-0e42ff2121d6" },
        { catalogId: "aljazeera", columnId: "bae3f145-588d-4c24-b16d-21b60d8899a3" },
        { catalogId: "bbc-world", columnId: "c2b25154-a43b-4f6f-93ce-0589135dc563" },
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
        { catalogId: "devto", columnId: "8322c1a7-f8a4-47ca-a1ea-fd117d813916" },
        { catalogId: "github-trending", columnId: "56d80ad4-e5d2-4749-b1e9-dcb39581ef9d" },
        {
          id: "9b1039b0-7ca1-464d-b279-2abe0c2a543d",
          title: "Tech news",
          kind: "header",
        },
        { catalogId: "ars", columnId: "d064c4bb-e11f-4aa1-aba1-6a355cbcb90f" },
        { catalogId: "verge", columnId: "be4225c2-0f48-4edf-8476-99f962f3cf90" },
        { catalogId: "wired", columnId: "3d2e7478-42cd-4f07-808a-3a2c536c76c0" },
        { catalogId: "tc", columnId: "a68c6cfd-2224-4317-bcd5-7734af60b6d1" },
        { catalogId: "engadget", columnId: "78cd6749-6577-464b-94b2-80b127b040cc" },
        { catalogId: "slashdot", columnId: "fabb11a5-ef20-4bcc-bd47-31c16c14c989" },
        {
          id: "03cc2e0f-54d8-4c37-b5d2-8ecdc768f096",
          title: "Dev & design",
          kind: "header",
        },
        { catalogId: "rfc", columnId: "f7e39c46-54a8-4272-ae7f-7f145f7f0bec" },
        { catalogId: "xkcd", columnId: "b506a6b7-3eb1-4d87-881d-f0cf11025f70" },
        { catalogId: "smashing", columnId: "673b98bc-6bd9-4490-b879-44df5fced773" },
        { catalogId: "css-tricks", columnId: "e524d0fd-72d5-4a51-a450-ff5a5405bda8" },
      ],
    },
    {
      id: "page-business",
      name: "Business",
      columns: [
        {
          id: "76ca9aa2-f7bd-44bf-b10e-3de65072ee47",
          title: "Markets",
          kind: "header",
        },
        { catalogId: "bloomberg", columnId: "c34a620a-315a-4067-aedc-c86bfa4555d1" },
        { catalogId: "wsj-world", columnId: "34a66236-87ae-41a6-ba5b-44cd3e8b5c47" },
        { catalogId: "marketwatch", columnId: "a0d3914d-0109-4113-bc56-40237bd71410" },
        { catalogId: "economist", columnId: "7a81fd04-fcc5-43f7-b3da-0b35c72c12a4" },
        {
          id: "f7365583-bc50-456f-9672-459c17033a5a",
          title: "Global & analysis",
          kind: "header",
        },
        { catalogId: "ft-world", columnId: "5b685dab-7ed8-49a7-94a3-d7432ed95ce9" },
        { catalogId: "nyt-business", columnId: "498149d6-b283-4cbb-8250-c5fc2a0db799" },
        { catalogId: "wired-business", columnId: "e01bc8cc-7202-4920-98b9-c78295e736da" },
      ],
    },
    {
      id: "page-science",
      name: "Science",
      columns: [
        {
          id: "f25698f1-5fb7-4024-8f56-c13e826b0c1c",
          title: "Science desk",
          kind: "header",
        },
        { catalogId: "nature-news", columnId: "a31d89a4-82fb-4487-8d34-8a115dcd9275" },
        { catalogId: "sci-am", columnId: "6d022615-cead-49f6-bc6c-00035f19100c" },
        { catalogId: "science-daily", columnId: "4ae833c6-99d1-4249-878d-907cd33429d7" },
        {
          id: "73cd0a7b-45bc-4dce-8fa8-0e0793f1ca58",
          title: "Space & health",
          kind: "header",
        },
        { catalogId: "nasa-breaking", columnId: "526790b6-f0fc-4301-96a1-6dbd73e7507f" },
        { catalogId: "phys-org", columnId: "624957ed-df2b-443b-989a-58d3913881c0" },
        { catalogId: "who", columnId: "16e8fb4d-e053-4bca-b653-53b857772b5c" },
      ],
    },
    {
      id: "page-culture",
      name: "Culture",
      columns: [
        {
          id: "8dc32a49-f230-4f28-b294-d99b56f7cb46",
          title: "Arts & places",
          kind: "header",
        },
        { catalogId: "atlas-obscura", columnId: "99b59bc0-95c1-43b5-ac7e-bc28257ad687" },
        { catalogId: "smithsonian", columnId: "bbb6a323-837e-4f19-9457-3bc568a512e9" },
        { catalogId: "wait-but-why", columnId: "697594f0-074b-4858-93cc-c93d234f1f4d" },
        {
          id: "a12eb8b6-f571-4183-91ff-8236374b9bf5",
          title: "Ideas",
          kind: "header",
        },
        { catalogId: "wired-design", columnId: "dd679586-55d5-4ca7-8015-fa6e91dad613" },
        { catalogId: "ribbonfarm", columnId: "3a6f39b8-9ac0-4292-bf4b-6df524762535" },
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
