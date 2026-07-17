import { env } from "cloudflare:workers";
import { assertSameOrigin, authErrorResponse, requireSessionUser } from "../../../lib/auth";
import { recordReadingHeartbeat } from "../../../lib/store";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireSessionUser(env, request);
    const body = await request.json() as { itemId?: number };
    const itemId = Number(body.itemId);
    if (!Number.isInteger(itemId) || itemId <= 0) return Response.json({ error: "文章 ID 不合法" }, { status: 400 });
    return Response.json(await recordReadingHeartbeat(env, user.id, itemId));
  } catch (error) {
    return authErrorResponse(error, "记录阅读时间失败");
  }
}
