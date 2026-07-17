import { env } from "cloudflare:workers";
import { pendingWechatSubscriptions, syncAllSources, updateSubscriptionRequest } from "../../../lib/store";
import { requireImportAccess } from "../_access";

export async function GET(request: Request) {
  try {
    const denied = requireImportAccess(request, env);
    if (denied) return denied;
    return Response.json({ requests: await pendingWechatSubscriptions(env) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取公众号任务失败" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const denied = requireImportAccess(request, env);
    if (denied) return denied;
    const body = await request.json() as { action?: "sync-all"; id?: number; status?: "pending" | "completed" | "failed"; error?: string; stage?: string; resultName?: string; itemCount?: number };
    if (body.action === "sync-all") return Response.json({ added: await syncAllSources(env) });
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0 || !body.status) throw new Error("公众号任务状态不合法");
    await updateSubscriptionRequest(env, id, body.status, body.error?.slice(0, 500) || "", body.stage?.slice(0, 40) || "queued", body.resultName?.slice(0, 80) || "", Math.max(0, Number(body.itemCount) || 0));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新公众号任务失败" }, { status: 400 });
  }
}
