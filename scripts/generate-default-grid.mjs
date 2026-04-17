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
        { catalogId: "reddit-news", columnId: "e891ec2e-e70c-4b39-b74a-c41b3e922d9b" },
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
        {
          id: "b4d69d72-68cd-4b72-ac25-9e7bde9b6129",
          title: "US & national",
          kind: "header",
        },
        { catalogId: "cnn-top", columnId: "9ec52ce9-ab92-40d8-bc6d-ddc92c7ac583" },
        { catalogId: "washpost-politics", columnId: "889b917c-d519-493e-8546-205575b32ab7" },
        { catalogId: "newyorker", columnId: "b9397a02-b7e3-4db7-bf04-14a4c55c0671" },
        {
          id: "10b99785-8c9a-4979-b5fb-d81f982ecd95",
          title: "Tech & rights",
          kind: "header",
        },
        { catalogId: "bbc-tech", columnId: "e109ac54-25b8-499f-a576-e55331ff6a83" },
        { catalogId: "guardian-tech", columnId: "8a37be87-025d-48f6-bb14-5b76b8a020cb" },
        { catalogId: "eff", columnId: "02d6dfd0-cbc3-4d60-9cb2-78b1ddd7b65c" },
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
        { catalogId: "reddit-programming", columnId: "c096fc93-a93d-46b7-a2fb-fb9a471c557e" },
        { catalogId: "producthunt", columnId: "b236ee04-85cb-4ffc-b8d7-73a5a4c109df" },
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
          id: "5f6ee6c0-1dd2-4aef-aa22-05cc2f4efe24",
          title: "AI",
          kind: "header",
        },
        { catalogId: "techcrunch-ai", columnId: "d272b628-d022-4935-a9ed-35e5d467f6ca" },
        { catalogId: "mit-tr-ai", columnId: "5dbdc5a8-e70b-42e8-beb1-94296bd7df7e" },
        { catalogId: "wired-ai", columnId: "60e40bd7-f1a0-4daa-bd89-4b743eb48dbe" },
        { catalogId: "simon-willison", columnId: "fbe91efd-715c-4c78-908d-f30caf441e8c" },
        { catalogId: "openai-blog", columnId: "06bbe81d-6020-4c57-9775-416f00e9afb6" },
        { catalogId: "venturebeat", columnId: "601abdd8-489d-4050-8e3f-809faf3d747e" },
        {
          id: "03cc2e0f-54d8-4c37-b5d2-8ecdc768f096",
          title: "Dev & design",
          kind: "header",
        },
        { catalogId: "rfc", columnId: "f7e39c46-54a8-4272-ae7f-7f145f7f0bec" },
        { catalogId: "xkcd", columnId: "b506a6b7-3eb1-4d87-881d-f0cf11025f70" },
        { catalogId: "smashing", columnId: "673b98bc-6bd9-4490-b879-44df5fced773" },
        { catalogId: "css-tricks", columnId: "e524d0fd-72d5-4a51-a450-ff5a5405bda8" },
        { catalogId: "web-dev", columnId: "37421daa-9544-45e2-823f-ccf7cc0138e7" },
        { catalogId: "opensource-com", columnId: "ca1d2349-4626-4213-9340-750ebae2fa67" },
        {
          id: "511a96e8-06c3-4b95-8412-2b8b5cef6c2a",
          title: "Security & industry",
          kind: "header",
        },
        { catalogId: "mit-tech-review", columnId: "eff66ccc-a507-47a5-98b5-02402a40a706" },
        { catalogId: "therecord", columnId: "83f7370b-6db6-4e8b-96bd-438aeced68ed" },
        { catalogId: "zdnet", columnId: "20707f54-0f49-40dc-9ab4-1a41ea96e840" },
        {
          id: "c4c2d771-ce25-4d56-9cc7-64c0c294b3bc",
          title: "More voices",
          kind: "header",
        },
        { catalogId: "mozilla-hacks", columnId: "c923392e-2e0f-4dd6-a376-f0080ecd80a6" },
        { catalogId: "kernel", columnId: "66da673a-f4a6-4463-91cd-2899c1fcba64" },
        { catalogId: "hn-best", columnId: "1717d472-cc59-4c2a-b541-2cf18446a922" },
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
        { catalogId: "stratechery", columnId: "6d9b6fe1-f12e-4e3a-9a89-532d51291ec1" },
        { catalogId: "cnet", columnId: "c2094485-b856-4fbd-9973-890cef7824e1" },
        {
          id: "f7365583-bc50-456f-9672-459c17033a5a",
          title: "Global & analysis",
          kind: "header",
        },
        { catalogId: "ft-world", columnId: "5b685dab-7ed8-49a7-94a3-d7432ed95ce9" },
        { catalogId: "nyt-business", columnId: "498149d6-b283-4cbb-8250-c5fc2a0db799" },
        { catalogId: "wired-business", columnId: "e01bc8cc-7202-4920-98b9-c78295e736da" },
        {
          id: "73744d07-9c00-4fae-a5b9-898475c1c088",
          title: "Commentary",
          kind: "header",
        },
        { catalogId: "nyt-tech", columnId: "737597dc-171d-4f7c-a724-ce95cdc8108a" },
        { catalogId: "marginal-revolution", columnId: "86cc5078-6ad9-4d6f-a9af-ca64859c2985" },
        { catalogId: "works-in-progress", columnId: "fc8f49d2-3317-47f8-9767-260f7d9020f5" },
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
        {
          id: "ffe2e3e8-4765-4edc-9de3-67481b7fa18a",
          title: "Deep dives",
          kind: "header",
        },
        { catalogId: "quanta-magazine", columnId: "ffd4a7a4-5d9c-4bef-9b26-69b7895fdc91" },
        { catalogId: "space-com", columnId: "50d1b727-3644-4ecc-9c50-331e6e78a9c2" },
        { catalogId: "cdc", columnId: "259494cf-6bc4-4a97-b6be-9b27a5012a4a" },
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
        { catalogId: "zvi-mowshowitz", columnId: "033d4842-7b67-4812-9fe3-594edba5d5e3" },
        {
          id: "60d20bbf-46a9-40d6-9005-15d92b21152a",
          title: "Essays & reviews",
          kind: "header",
        },
        { catalogId: "aeon", columnId: "c1580b3e-c2f5-4bb2-9086-53cee4453d6f" },
        { catalogId: "larb", columnId: "19e88b8e-cfb8-48cf-b601-87fdfb8931d4" },
        { catalogId: "3quarks-daily", columnId: "4f005f7a-908f-4cc9-91b4-bb8429d155bd" },
      ],
    },
    {
      id: "page-sports",
      name: "Sports",
      columns: [
        {
          id: "05943908-609d-4027-a45c-9a052aeb6b69",
          title: "Wire & majors",
          kind: "header",
        },
        { catalogId: "espn-top", columnId: "ee16739e-68b2-44b4-83d3-6f6a03703d58" },
        { catalogId: "bbc-sport", columnId: "843446df-f96b-4e6c-9ee7-80e7ab823722" },
        { catalogId: "guardian-sport", columnId: "62537d81-12ce-4136-bb56-a6add5fae81b" },
        {
          id: "9c1d9e2d-c232-49dc-b381-2c038b9d0ff0",
          title: "National & digital",
          kind: "header",
        },
        { catalogId: "nyt-sports", columnId: "fe4d0a4b-97ad-4eb0-81e9-52ee786b6a33" },
        { catalogId: "yahoo-sports", columnId: "5110203b-ae05-46ff-ba9f-595ae1d97397" },
        { catalogId: "cbssports-headlines", columnId: "6263e75d-ead6-4f20-9bab-f275e5fe9c13" },
        {
          id: "c20fd707-9bb8-4e0d-b132-c0278fdd6fcb",
          title: "Community",
          kind: "header",
        },
        { catalogId: "reddit-sports", columnId: "560b4564-fc37-4dd3-84f3-e5433a5fe1ee" },
        { catalogId: "reddit-nfl", columnId: "3ac4b5b1-a10d-4dac-9280-a2331ba5c8b0" },
        { catalogId: "reddit-nba", columnId: "90166762-c69b-4827-a1ac-b0d227bb57b5" },
      ],
    },
    {
      id: "page-ideas",
      name: "Ideas",
      columns: [
        {
          id: "bc866bfc-49b3-422c-908e-1593f453b2e0",
          title: "Sensemaking",
          kind: "header",
        },
        { catalogId: "long-now-foundation", columnId: "dc0e5316-9275-4a35-b795-a9f75749e96d" },
        { catalogId: "edge-org", columnId: "cf1814b2-6331-4be2-95f4-77cd23796b0a" },
        { catalogId: "noema-magazine", columnId: "3656a78c-198a-4b39-94aa-9d7f0e790895" },
        { catalogId: "metamoderna", columnId: "0c08e453-20ec-4299-aa77-af6dbbc2b2af" },
        { catalogId: "psyche", columnId: "484ead80-d544-4299-8fad-51d8e986f177" },
        { catalogId: "nautilus", columnId: "ededf7c3-8b2a-4d82-831b-81f6892699fb" },
        {
          id: "a15dfa88-dabe-42aa-99a6-721b8e77feb9",
          title: "Philosophy & mind",
          kind: "header",
        },
        { catalogId: "daily-nous", columnId: "a6717739-2dd2-4e56-87a3-53e60517384e" },
        { catalogId: "psypost", columnId: "5f2234ad-a18d-4aea-aeb8-cedb3a892a72" },
        { catalogId: "brains-blog", columnId: "cdc27e11-69d8-4197-a729-d633bee29f9e" },
      ],
    },
    {
      id: "page-philosophy",
      name: "Philosophy",
      columns: [
        {
          id: "77a004b5-e20a-45b1-9ff0-e8531701865f",
          title: "Reference",
          kind: "header",
        },
        { catalogId: "sep-plato", columnId: "a008b643-15db-42f1-8451-1ea739c0a71e" },
        { catalogId: "philpapers", columnId: "f37489b8-a1b2-4e06-8cb0-40e76277721d" },
        { catalogId: "journal-consciousness-studies", columnId: "bb8e4660-bda4-4cd6-b668-cd7d568c697f" },
        {
          id: "a1d04dc0-2de0-40f2-bf04-55eab5215424",
          title: "Profession & blogs",
          kind: "header",
        },
        { catalogId: "daily-nous", columnId: "0ec0f147-5edf-4382-86d9-2d0e0e5ec9e0" },
        { catalogId: "brains-blog", columnId: "81f4f08a-8245-4d35-b396-7051d6cab764" },
        { catalogId: "philosophy-for-life", columnId: "1bb185a3-e5b8-4189-af52-fe61e1ba11fd" },
        {
          id: "c967eb9b-d19b-49b9-be27-4f1b513541c4",
          title: "Reviews & magazines",
          kind: "header",
        },
        { catalogId: "new-atlantis", columnId: "9005213e-4a19-4c7a-8be0-9ff134622dbf" },
        { catalogId: "the-point-magazine", columnId: "efb4e73a-5fa1-4f54-b163-d6aebe721619" },
        { catalogId: "public-books", columnId: "b57e0697-7c2e-4258-b7e6-eecad90ed735" },
        {
          id: "29e9c6d4-5199-40d6-acd1-e464d706c1e2",
          title: "Essays & culture",
          kind: "header",
        },
        { catalogId: "3quarks-daily", columnId: "98844057-d12e-4d00-85a4-5ea9b4a64427" },
        { catalogId: "larb", columnId: "bda72a9a-c484-40ec-ba88-1df16b53db23" },
        { catalogId: "meaningness-chapman", columnId: "61d86b88-f157-4855-b1b9-a3bb8696c621" },
      ],
    },
    {
      id: "page-spirituality",
      name: "Spirituality",
      columns: [
        {
          id: "7cf9c50f-a58c-4246-8e74-4272cb4b4c3d",
          title: "Meditation & Dharma",
          kind: "header",
        },
        { catalogId: "plum-village", columnId: "998308a6-a439-4991-af3f-17b46d4574ae" },
        { catalogId: "insight-meditation-society", columnId: "69b590c6-384b-43d8-88d2-300fc397ae74" },
        { catalogId: "dharma-seed", columnId: "26643394-06e5-41f1-a12d-41bff2de6070" },
        { catalogId: "sravasti-abbey", columnId: "9108792f-b34b-4efc-9305-d6ef504d4436" },
        { catalogId: "integral-zen", columnId: "16d12db2-ed5e-4265-a2aa-48e753d397a5" },
        { catalogId: "mind-and-life-institute", columnId: "4f0652e0-1f6d-4e18-8995-15b985eff170" },
        {
          id: "6561b816-8496-44b0-8e8c-4a4c9d51abf1",
          title: "Integral & dialogue",
          kind: "header",
        },
        { catalogId: "integral-life", columnId: "cdaaf6f9-2340-4341-961e-d82357d6296e" },
        { catalogId: "rebel-wisdom", columnId: "7aa7d4df-7ad3-4425-8a4f-d4ef46af25c3" },
        { catalogId: "the-stoa", columnId: "02fcc771-b41f-4dd8-a820-92fea9b33975" },
        { catalogId: "perspectiva", columnId: "8b836ec0-9165-4ddd-b1c2-e8467373b85c" },
        { catalogId: "daily-evolver", columnId: "730e07f7-b799-42bb-8457-39b15b10906d" },
        { catalogId: "emerge-podcast", columnId: "3a03fd31-705b-4656-9f62-71deda469562" },
        {
          id: "22f0d0de-cfd2-4fe0-8d7f-e9346fc0175c",
          title: "Yoga & contemplative paths",
          kind: "header",
        },
        { catalogId: "auroville", columnId: "bcc508a3-c4b2-40d9-a325-98199e33a34f" },
        { catalogId: "sri-aurobindo-society", columnId: "b58bdfbb-a18b-40fe-9d67-6c68ce20fd3d" },
        { catalogId: "integral-yoga-magazine", columnId: "2391f2cf-c8da-41ad-8b57-d02a33635f98" },
        { catalogId: "mothers-service-society", columnId: "e05e6880-2de5-428c-a8b6-bd9d793cbc8e" },
        { catalogId: "evolving-ground", columnId: "f23ffd20-4e99-4cb6-b475-58b66ceffc0d" },
        { catalogId: "beams-and-struts", columnId: "3a83bc45-3d1f-4448-8be1-6d6fd81a569b" },
        {
          id: "e6796c07-73d5-4daf-8fe2-f95fa46a0c17",
          title: "Consciousness",
          kind: "header",
        },
        { catalogId: "science-and-nonduality", columnId: "e96a3516-cec7-4a97-9623-86893d234e1a" },
        { catalogId: "ions-noetic", columnId: "f0ede534-522e-4f94-ab7b-768e9c6981cc" },
        { catalogId: "batgap", columnId: "9f12d0bd-df08-4b1c-924b-0bd2d97fa314" },
        { catalogId: "nonduality-com", columnId: "1f2e90b3-8350-484b-9186-c043100d6e0e" },
        { catalogId: "esalen-institute", columnId: "a9da18e0-3ad1-47e5-9bf2-d9af38ae0576" },
        { catalogId: "essentia-foundation", columnId: "218c8111-de93-4671-bb60-ae9b260ad814" },
      ],
    },
  ],
  activePageId: "page-news",
};

/** Each section (feeds after a header until the next header or page end) must list a multiple of 3 feeds. */
function assertSectionFeedsDivisibleByThree() {
  for (const page of recipe.pages) {
    let n = 0;
    const flush = (where) => {
      if (n % 3 !== 0) {
        throw new Error(
          `Default grid "${page.name}" (${page.id}): section ending at ${where} has ${n} feeds (must be divisible by 3).`,
        );
      }
      n = 0;
    };
    for (const col of page.columns) {
      if ("catalogId" in col) {
        n += 1;
      } else if (col.kind === "header") {
        flush(`header "${col.title}"`);
      }
    }
    flush("end of page");
  }
}

assertSectionFeedsDivisibleByThree();

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
