import { fetchPublicText, publicHttpUrl } from "./safe-fetch";
import type { FeedEntry } from "./feed";
import { normalizeXPublishedAt } from "./x-date";
import { collectXArticlePages, type XArticlePage } from "./x-pagination";

type XEntity = { key?: string | number; value?: { data?: { markdown?: string } } };
type XBlock = { type?: string; text?: string; entityRanges?: Array<{ key?: string | number }> };

const X_HOSTS = new Set(["x.com", "twitter.com"]);
const RESERVED_X_PATHS = new Set(["about", "compose", "explore", "home", "i", "jobs", "login", "messages", "notifications", "privacy", "search", "settings", "share", "signup", "tos"]);
function xUrl(value: string) {
  const url = publicHttpUrl(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return X_HOSTS.has(host) ? url : null;
}

export function xPostAddress(value: string) {
  const url = xUrl(value);
  if (!url) return null;
  const status = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/i);
  if (status) return { kind: "status" as const, username: status[1], id: status[2], url: url.toString() };
  const article = url.pathname.match(/^\/(?:i\/)?article\/(\d+)/i) || url.pathname.match(/^\/([^/]+)\/article\/(\d+)/i);
  if (article) return { kind: "article" as const, username: article.length > 2 ? article[1] : "", id: article.at(-1) || "", url: url.toString() };
  return null;
}

export function xProfileAddress(value: string) {
  const url = xUrl(value);
  if (!url) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 1 || RESERVED_X_PATHS.has(parts[0].toLowerCase()) || !/^[A-Za-z0-9_]{1,15}$/.test(parts[0])) return null;
  return { username: parts[0], url: `https://x.com/${parts[0]}` };
}

function articleMarkdown(article: Record<string, unknown>) {
  const content = article.content as { blocks?: XBlock[]; entityMap?: XEntity[] } | undefined;
  const entities = new Map((content?.entityMap || []).map((entity) => [String(entity.key), entity.value?.data?.markdown || ""]));
  const blocks = (content?.blocks || []).flatMap((block) => {
    const text = block.text?.trim() || "";
    if (block.type === "atomic") {
      const embedded = entities.get(String(block.entityRanges?.[0]?.key ?? ""));
      return embedded ? [embedded] : [];
    }
    if (!text) return [];
    if (block.type === "header-one") return [`# ${text}`];
    if (block.type === "header-two") return [`## ${text}`];
    if (block.type === "header-three") return [`### ${text}`];
    if (block.type === "unordered-list-item") return [`- ${text}`];
    if (block.type === "ordered-list-item") return [`1. ${text}`];
    if (block.type === "blockquote") return [`> ${text}`];
    return [text];
  });
  const cover = article.cover_media as { media_info?: { original_img_url?: string } } | undefined;
  const coverUrl = cover?.media_info?.original_img_url;
  return [coverUrl ? `![封面](${coverUrl})` : "", ...blocks].filter(Boolean).join("\n\n");
}

export async function readXPost(value: string) {
  const address = xPostAddress(value);
  if (!address || address.kind !== "status") return null;
  const endpoint = `https://api.fxtwitter.com/${encodeURIComponent(address.username)}/status/${address.id}`;
  const { response, text } = await fetchPublicText(endpoint, { accept: "application/json", maxBytes: 3_000_000 });
  if (!response.ok) throw new Error(`X 正文服务返回 ${response.status}`);
  const payload = JSON.parse(text) as { tweet?: Record<string, unknown> };
  const tweet = payload.tweet;
  if (!tweet) throw new Error("没有读取到这条 X 内容");
  const article = tweet.article as Record<string, unknown> | undefined;
  const author = tweet.author as { name?: string; screen_name?: string } | undefined;
  const textContent = typeof tweet.text === "string" ? tweet.text.trim() : "";
  const articleContent = article ? articleMarkdown(article) : "";
  const title = typeof article?.title === "string" && article.title.trim()
    ? article.title.trim()
    : textContent.split("\n").find(Boolean)?.slice(0, 120) || `X · @${address.username}`;
  const excerpt = typeof article?.preview_text === "string" ? article.preview_text.trim() : textContent.slice(0, 600);
  const publishedAt = normalizeXPublishedAt([article?.created_at, tweet.created_at], address.id);
  return {
    title,
    excerpt,
    contentMarkdown: articleContent || textContent,
    author: author?.name ? `${author.name}${author.screen_name ? ` (@${author.screen_name})` : ""}` : `@${address.username}`,
    publishedAt,
  };
}

export async function readXProfile(value: string) {
  const address = xProfileAddress(value);
  if (!address) throw new Error("这不是有效的 X 作者主页");
  const endpoint = `https://api.fxtwitter.com/2/profile/${encodeURIComponent(address.username)}`;
  const { response, text } = await fetchPublicText(endpoint, { accept: "application/json", maxBytes: 800_000 });
  if (!response.ok) throw new Error(`X 作者服务返回 ${response.status}`);
  const payload = JSON.parse(text) as { user?: { name?: string; screen_name?: string; description?: string; avatar_url?: string } };
  if (!payload.user?.screen_name) throw new Error("没有识别到这个 X 作者");
  return {
    username: payload.user.screen_name,
    name: payload.user.name?.trim() || `@${payload.user.screen_name}`,
    description: payload.user.description?.trim() || "",
    avatarUrl: payload.user.avatar_url?.trim() || "",
  };
}

export async function readXArticles(username: string): Promise<FeedEntry[]> {
  const safeUsername = username.trim();
  if (!/^[A-Za-z0-9_]{1,15}$/.test(safeUsername)) throw new Error("X 用户名不合法");
  const statuses = await collectXArticlePages(async (cursor) => {
    const endpoint = `https://api.fxtwitter.com/2/profile/${encodeURIComponent(safeUsername)}/articles?count=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const result = await fetchPublicText(endpoint, {
      accept: "application/json",
      maxBytes: 4_000_000,
      timeoutMs: 20_000,
    });
    if (!result.response.ok) throw new Error(`X 长文章服务返回 ${result.response.status}`);
    return JSON.parse(result.text) as XArticlePage;
  });
  return statuses.flatMap((status) => {
    const article = status.article;
    const title = typeof article?.title === "string" ? article.title.trim() : "";
    const url = status.url?.trim() || (status.id ? `https://x.com/${safeUsername}/status/${status.id}` : "");
    if (!article || !title || !url) return [];
    const preview = typeof article.preview_text === "string" ? article.preview_text.trim() : status.text?.trim() || "";
    const content = articleMarkdown(article);
    const author = status.author?.name
      ? `${status.author.name}${status.author.screen_name ? ` (@${status.author.screen_name})` : ""}`
      : `@${safeUsername}`;
    return [{
      title,
      excerpt: preview,
      contentMarkdown: content || preview,
      author,
      url,
      publishedAt: normalizeXPublishedAt([article.created_at, status.created_at], status.id),
    }];
  });
}
