import { env } from "cloudflare:workers";
import { authErrorResponse, changePassword } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { currentPassword?: string; newPassword?: string; confirmPassword?: string };
    const result = await changePassword(env, request, body);
    return Response.json({ user: result.user }, { headers: { "set-cookie": result.cookie } });
  } catch (error) {
    return authErrorResponse(error, "修改密码失败");
  }
}
