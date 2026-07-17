import { env } from "cloudflare:workers";
import { assertSameOrigin, authErrorResponse, requireSessionUser } from "../../../lib/auth";
import { addSubscription, assertSourceContributor, deleteSource, setSourceEnabled, setSourceFollowing, syncSource } from "../../../lib/store";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireSessionUser(env, request);
    const body = await request.json() as { action: "add" | "follow" | "toggle" | "sync" | "delete"; name?: string; url?: string; category?: string; id?: number; enabled?: boolean; following?: boolean };
    if (body.action === "add") return Response.json(await addSubscription(env, body.url ?? "", user.id, body.category));
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("操作或信息源 ID 不合法");
    if (body.action === "follow") { await setSourceFollowing(env, id, user.id, Boolean(body.following)); return Response.json({ ok: true }); }
    await assertSourceContributor(env, id, user.id);
    if (body.action === "toggle") { await setSourceEnabled(env, id, Boolean(body.enabled)); return Response.json({ ok: true }); }
    if (body.action === "sync") return Response.json({ added: await syncSource(env, id) });
    if (body.action === "delete") { await deleteSource(env, id); return Response.json({ ok: true }); }
    throw new Error("未知操作");
  } catch (error) {
    return authErrorResponse(error, "操作失败");
  }
}
