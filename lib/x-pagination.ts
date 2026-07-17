export type XArticleStatus = {
  id?: string;
  url?: string;
  text?: string;
  created_at?: string;
  author?: { name?: string; screen_name?: string };
  article?: Record<string, unknown>;
};

export type XArticlePage = { results?: XArticleStatus[]; cursor?: { bottom?: string } };

export async function collectXArticlePages(fetchPage: (cursor: string) => Promise<XArticlePage>, target = 20) {
  const safeTarget = Math.max(1, Math.min(100, Math.floor(target)));
  const collected: XArticleStatus[] = [];
  const seen = new Set<string>();
  let cursor = "";

  for (let pageNumber = 0; pageNumber < 5 && collected.length < safeTarget; pageNumber += 1) {
    const page = await fetchPage(cursor);
    const results = page.results || [];
    for (const status of results) {
      const key = status.id?.trim() || status.url?.trim() || "";
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      collected.push(status);
      if (collected.length >= safeTarget) break;
    }

    const nextCursor = page.cursor?.bottom?.trim() || "";
    if (!results.length || !nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }

  return collected.slice(0, safeTarget);
}
