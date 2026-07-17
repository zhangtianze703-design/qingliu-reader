import { env } from "cloudflare:workers";
import { assertSameOrigin, authErrorResponse, requireSessionUser } from "../../../lib/auth";
import { listNotifications, markNotificationsRead } from "../../../lib/store";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser(env, request);
    const notifications = await listNotifications(env, user.id);
    return Response.json({ notifications, unreadCount: notifications.filter((notification) => !notification.isRead).length });
  } catch (error) {
    return authErrorResponse(error, "读取通知失败");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireSessionUser(env, request);
    const body = await request.json() as { notificationId?: number };
    await markNotificationsRead(env, user.id, body.notificationId);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, "更新通知失败");
  }
}
