const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

export function decodeHtml(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return ENTITY_MAP[code.toLowerCase()] ?? entity;
    const numeric = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity;
  });
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function readHtmlMeta(html: string, key: string) {
  const safe = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${safe}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${safe}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function mainHtml(html: string) {
  const candidates = [
    /<div[^>]+id=["']js_content["'][^>]*>([\s\S]*?)(?:<script|<div[^>]+id=["']js_sponsor)/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<body[^>]*>([\s\S]*?)<\/body>/i,
  ];
  for (const candidate of candidates) {
    const match = html.match(candidate);
    if (match?.[1] && stripTags(match[1]).length > 160) return match[1];
  }
  return html;
}

function safeLink(value: string) {
  try {
    const url = new URL(decodeHtml(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function htmlToMarkdown(input: string) {
  // Feed payloads often entity-escape their entire HTML fragment. Decode the
  // fragment before walking tags so images and structure reach the converters.
  let html = decodeHtml(input)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|svg|form|button|noscript|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/gi, (tag, src: string) => {
      const alt = stripTags(tag.match(/alt=["']([^"']*)["']/i)?.[1] || "配图");
      const link = safeLink(src);
      return link ? `\n\n![${alt}](${link})\n\n` : "";
    })
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_tag, href: string, label: string) => {
      const text = stripTags(label);
      const link = safeLink(href);
      return link && text ? `[${text}](${link})` : text;
    });

  for (let level = 6; level >= 1; level -= 1) {
    html = html.replace(new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi"), (_tag, value: string) => `\n\n${"#".repeat(level)} ${stripTags(value)}\n\n`);
  }

  html = html
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_tag, value: string) => `\n\n> ${stripTags(value)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_tag, value: string) => `\n- ${stripTags(value)}`)
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_tag, _name: string, value: string) => `**${stripTags(value)}**`)
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_tag, _name: string, value: string) => `*${stripTags(value)}*`)
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_tag, value: string) => `\`${stripTags(value)}\``)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|figure|ul|ol|pre)>/gi, "\n\n")
    .replace(/<(p|div|section|figure|ul|ol|pre)[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtml(html)
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 120_000);
}

export function extractArticle(html: string) {
  const markdown = htmlToMarkdown(mainHtml(html));
  const author = readHtmlMeta(html, "author") || readHtmlMeta(html, "article:author") || readHtmlMeta(html, "og:article:author");
  return { markdown, author };
}
