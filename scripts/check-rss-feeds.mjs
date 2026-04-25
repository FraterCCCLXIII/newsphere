#!/usr/bin/env node
/**
 * Fetches every feed URL in public/catalog-sources.json and reports failures.
 * Usage: node scripts/check-rss-feeds.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const catalogPath = join(root, "public", "catalog-sources.json");

const TIMEOUT_MS = 20_000;
const CONCURRENCY = 10;
const UA = "NewsphereRSSCheck/1.0 (+https://github.com/)";

function looksLikeFeed(text) {
  const s = text.slice(0, 8000).toLowerCase();
  return (
    s.includes("<rss") ||
    s.includes("<feed") ||
    s.includes("xmlns=\"http://www.w3.org/2005/atom\"") ||
    s.includes("<rdf:rdf") ||
    s.includes("application/rss+xml")
  );
}

async function checkOne(entry) {
  const { id, name, url } = entry;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": UA,
      },
      redirect: "follow",
    });
    const status = res.status;
    const ct = res.headers.get("content-type") ?? "";
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);

    if (!res.ok) {
      return { id, name, url, ok: false, reason: `HTTP ${status}`, status, ct };
    }
    if (!looksLikeFeed(text)) {
      return {
        id,
        name,
        url,
        ok: false,
        reason: "Body does not look like RSS/Atom",
        status,
        ct: ct.slice(0, 80),
      };
    }
    return { id, name, url, ok: true, status, ct: ct.slice(0, 60) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id, name, url, ok: false, reason: msg, status: null, ct: null };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const raw = readFileSync(catalogPath, "utf8");
const entries = JSON.parse(raw);

console.error(`Checking ${entries.length} feeds (timeout ${TIMEOUT_MS}ms, concurrency ${CONCURRENCY})...\n`);

const results = await pool(entries, CONCURRENCY, checkOne);
const bad = results.filter((r) => !r.ok);

for (const r of bad) {
  console.log(`FAIL  [${r.id}] ${r.name}`);
  console.log(`      ${r.url}`);
  console.log(`      ${r.reason}${r.status != null ? ` | content-type: ${r.ct ?? "?"}` : ""}`);
  console.log("");
}

const ok = results.length - bad.length;
console.log(`---`);
console.log(`OK: ${ok}  FAIL: ${bad.length}  TOTAL: ${results.length}`);
process.exit(bad.length > 0 ? 1 : 0);
