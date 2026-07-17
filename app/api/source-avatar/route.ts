import { env } from "cloudflare:workers";
import { ensureSchema } from "../../../lib/store";
import { publicHttpUrl } from "../../../lib/safe-fetch";
import { readXProfile } from "../../../lib/x";

const cacheHeaders = { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" };

export async function GET(request: Request) {
  try {
    await ensureSchema(env.DB);
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("订阅源头像参数不合法");
    const source = await env.DB.prepare("SELECT id, kind, url, avatar_url AS avatarUrl FROM sources WHERE id = ?")
      .bind(id).first<{ id: number; kind: string; url: string; avatarUrl: string | null }>();
    if (!source) return new Response(null, { status: 404 });

    let avatarUrl = source.avatarUrl || "";
    if (!avatarUrl && source.kind === "rss") avatarUrl = new URL("/favicon.ico", source.url).toString();
    if (!avatarUrl && source.kind === "x" && source.url.startsWith("x://")) {
      const profile = await readXProfile(`https://x.com/${source.url.slice(4)}`);
      avatarUrl = profile.avatarUrl;
      if (avatarUrl) await env.DB.prepare("UPDATE sources SET avatar_url = ? WHERE id = ?").bind(avatarUrl, source.id).run();
    }
    if (!avatarUrl) return new Response(null, { status: 404, headers: cacheHeaders });
    const safeUrl = publicHttpUrl(avatarUrl.replace(/^http:/i, "https:")).toString();
    return new Response(null, { status: 302, headers: { ...cacheHeaders, location: safeUrl } });
  } catch {
    return new Response(null, { status: 404, headers: cacheHeaders });
  }
}
