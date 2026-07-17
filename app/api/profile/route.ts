import { env } from "cloudflare:workers";
import { assertSameOrigin, authErrorResponse, getSessionUser, requireSessionUser, updateProfile } from "../../../lib/auth";
import { createProfileMessage, getPublicProfile, toggleProfileLike } from "../../../lib/store";

export async function GET(request: Request) {
  try {
    const viewer = await getSessionUser(env, request);
    const requestedId = Number(new URL(request.url).searchParams.get("userId"));
    const profileUserId = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : viewer?.id;
    if (!profileUserId) throw new Error("请先登录后再查看自己的主页");
    return Response.json({ profile: await getPublicProfile(env, profileUserId, viewer?.id || null) });
  } catch (error) {
    return authErrorResponse(error, "读取个人资料失败");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: "update" | "like" | "message"; userId?: number; nickname?: string; bio?: string; body?: string };
    if (!body.action || body.action === "update") return Response.json({ user: await updateProfile(env, request, body) });
    assertSameOrigin(request);
    const user = await requireSessionUser(env, request);
    const profileUserId = Number(body.userId);
    if (body.action === "like") return Response.json(await toggleProfileLike(env, user.id, profileUserId));
    if (body.action === "message") return Response.json({ message: await createProfileMessage(env, user.id, profileUserId, body.body) });
    throw new Error("主页操作不合法");
  } catch (error) {
    return authErrorResponse(error, "保存个人资料失败");
  }
}
