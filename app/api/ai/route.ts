import { env } from "cloudflare:workers";
import { authErrorResponse, requireSessionUser } from "../../../lib/auth";
import { processPendingItems } from "../../../lib/store";

export async function POST(request: Request) {
  try {
    await requireSessionUser(env, request);
    const result = await processPendingItems(env);
    if (!result.aiAvailable && result.waiting > 0) {
      return Response.json({ ...result, error: "AI 翻译尚未启用；原文已保留，可先继续收集和阅读。" }, { status: 503 });
    }
    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error, "处理失败");
  }
}
