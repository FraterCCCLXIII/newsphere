/**
 * Heuristics for “probably not the full article” after Readability extraction.
 * Not definitive—short opinion pieces or breaking blurbs can look “truncated”.
 */

const PAYWALL_OR_TEASER = new RegExp(
  [
    String.raw`subscribe\s+to\s+(read|continue|unlock|get)`,
    String.raw`continue\s+reading`,
    String.raw`read\s+(the\s+)?full\s+(story|article|piece)`,
    String.raw`full\s+article\s+is\s+(available|only)`,
    String.raw`members?\s+only`,
    String.raw`subscribers?\s+only`,
    String.raw`sign\s+in\s+to\s+read`,
    String.raw`this\s+(article|story)\s+is\s+for\s+subscribers`,
    String.raw`free\s+articles?\s+remaining`,
    String.raw`create\s+a\s+free\s+account`,
  ].join("|"),
  "i",
);

export type ReadabilityArticleFields = {
  textContent?: string | null;
  length?: number | null;
};

/** Visible text length of the full document (for ratio checks). */
export function documentBodyTextLength(doc: Document): number {
  const t = doc.body?.innerText ?? "";
  return t.replace(/\s+/g, " ").trim().length;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Returns true when we suspect the extracted block is a teaser / paywall /
 * incomplete relative to what the page holds.
 */
export function estimateLikelyTruncated(
  doc: Document,
  article: ReadabilityArticleFields,
): boolean {
  const text = article.textContent?.trim() ?? "";
  const charLen = article.length ?? text.length;
  const words = wordCount(text);

  if (text.length > 0 && PAYWALL_OR_TEASER.test(text)) {
    return true;
  }

  const bodyLen = documentBodyTextLength(doc);
  // Page has a lot of chrome + body copy, but Readability kept almost nothing.
  if (bodyLen > 6000 && charLen > 0 && charLen < 500) {
    return true;
  }

  // Very small extraction: often a deck + “read more” or a hard paywall stub.
  if (charLen > 0 && charLen < 320 && words < 55) {
    return true;
  }

  return false;
}
