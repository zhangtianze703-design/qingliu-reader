import { env } from "cloudflare:workers";
import { authErrorResponse, requireSessionUser } from "../../../lib/auth";
import { generateIdea } from "../../../lib/store";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser(env, request);
    await generateIdea(env, user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "生成失败");
  }
}
