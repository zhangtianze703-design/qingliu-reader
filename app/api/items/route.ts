import { env } from "cloudflare:workers";
import { assertSameOrigin, authErrorResponse, getSessionUser, requireSessionUser } from "../../../lib/auth";
import { captureLink, getItemDetail, importWechatArticles, listSourceItems, markItemRead, requestSubscription, updateItem } from "../../../lib/store";
import { requireImportAccess } from "../_access";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(env, request);
    const params = new URL(request.url).searchParams;
    const sourceId = Number(params.get("sourceId"));
    if (Number.isInteger(sourceId) && sourceId > 0) return Response.json({ items: await listSourceItems(env, sourceId, user?.id || null) });
    const id = Number(params.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("文章 ID 不合法");
    return Response.json(await getItemDetail(env, id, user?.id || null));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "文章读取失败" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action: "capture" | "read" | "mark-read" | "save" | "import-wechat" | "request-source"; id?: number; url?: string; title?: string; query?: string; requestId?: number; accountKey?: string; accountName?: string; avatarUrl?: string; articles?: Array<{ title: string; url: string; excerpt?: string; contentMarkdown?: string; author?: string; publishedAt?: string }> };
    if (body.action === "import-wechat") {
      const denied = requireImportAccess(request, env);
      if (denied) return denied;
      return Response.json({ added: await importWechatArticles(env, body.accountKey ?? "", body.accountName ?? "", body.articles ?? [], Number(body.requestId) || null, body.avatarUrl ?? "") });
    }
    assertSameOrigin(request);
    const user = await requireSessionUser(env, request);
    if (body.action === "capture") return Response.json(await captureLink(env, body.url ?? "", body.title));
    if (body.action === "request-source") { await requestSubscription(env, body.query ?? "", "unknown", user.id); return Response.json({ ok: true }); }
    const id = Number(body.id);
    if (body.action === "mark-read" && Number.isInteger(id) && id > 0) { await markItemRead(env, id, user.id); return Response.json({ ok: true }); }
    if ((body.action !== "read" && body.action !== "save") || !Number.isInteger(id) || id <= 0) throw new Error("操作或文章 ID 不合法");
    await updateItem(env, id, body.action, user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "操作失败");
  }
}
