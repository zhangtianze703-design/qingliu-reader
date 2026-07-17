import { env } from "cloudflare:workers";
import { assertSameOrigin, authErrorResponse, requireSessionUser } from "../../../lib/auth";
import { createAnnotation, createAnnotationReply, listAnnotationPlaza, listItemAnnotations, listUserAnnotations } from "../../../lib/store";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope");
    if (scope === "plaza") return Response.json({ annotations: await listAnnotationPlaza(env, params.get("sort") === "hot" ? "hot" : "latest") });
    if (scope === "mine") {
      const user = await requireSessionUser(env, request);
      return Response.json({ annotations: await listUserAnnotations(env, user.id) });
    }
    const itemId = Number(params.get("itemId"));
    if (!Number.isInteger(itemId) || itemId <= 0) throw new Error("文章 ID 不合法");
    return Response.json({ annotations: await listItemAnnotations(env, itemId) });
  } catch (error) {
    return authErrorResponse(error, "读取批注失败");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireSessionUser(env, request);
    const body = await request.json() as { action?: "create" | "reply"; itemId?: number; quote?: string; body?: string; blockIndex?: number; startOffset?: number; endOffset?: number; annotationId?: number; replyToUserId?: number };
    if (body.action === "create") return Response.json({ annotation: await createAnnotation(env, user.id, body) });
    if (body.action === "reply") return Response.json({ reply: await createAnnotationReply(env, user.id, body) });
    throw new Error("批注操作不合法");
  } catch (error) {
    return authErrorResponse(error, "保存批注失败");
  }
}
