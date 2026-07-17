import { htmlToMarkdown } from "./article";

export type FeedEntry = { title: string; url: string; excerpt: string | null; contentMarkdown: string | null; author: string | null; publishedAt: string | null };

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decode(match[1]) : null;
}

function rawTag(block: string, name: string) {
  return block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() || null;
}

function atomLink(block: string) {
  const alternate = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i);
  const plain = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  return alternate?.[1] ?? plain?.[1] ?? null;
}

export function isFeedDocument(value: string) {
  return /<(?:rss|feed|rdf:RDF)[\s>]/i.test(value);
}

export function feedTitle(value: string) {
  if (/<feed[\s>]/i.test(value)) return tag(value, "title");
  const channel = value.match(/<channel[\s>][\s\S]*?<\/channel>/i)?.[0] || value;
  return tag(channel, "title");
}

function attribute(element: string, name: string) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return element.match(new RegExp(`\\s${safe}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] || "";
}

export function discoverFeedLinks(html: string, pageUrl: string) {
  const links: string[] = [];
  for (const element of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = attribute(element, "rel").toLowerCase().split(/\s+/);
    const type = attribute(element, "type").toLowerCase();
    const href = attribute(element, "href");
    if (!href || !rel.includes("alternate") || !/(?:rss|atom|rdf|xml)/.test(type)) continue;
    try { links.push(new URL(href, pageUrl).toString()); } catch { /* Ignore malformed discovery links. */ }
  }
  return [...new Set(links)];
}

export function parseFeed(xml: string): FeedEntry[] {
  const isAtom = /<feed[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return blocks.slice(0, 20).flatMap((block) => {
    const title = tag(block, "title");
    const url = isAtom ? atomLink(block) : tag(block, "link");
    if (!title || !url || !/^https?:\/\//i.test(url)) return [];
    const rawContent = rawTag(block, "content:encoded") ?? rawTag(block, isAtom ? "content" : "description");
    return [{
      title,
      url,
      excerpt: tag(block, isAtom ? "summary" : "description") ?? tag(block, "content:encoded"),
      contentMarkdown: rawContent ? htmlToMarkdown(rawContent) : null,
      author: tag(block, "author") ?? tag(block, "dc:creator"),
      publishedAt: tag(block, isAtom ? "published" : "pubDate") ?? tag(block, "updated"),
    }];
  });
}
