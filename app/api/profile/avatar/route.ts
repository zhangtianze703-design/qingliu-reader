import { env } from "cloudflare:workers";
import { assertSameOrigin, authErrorResponse, requireSessionUser } from "../../../../lib/auth";
import { ensureSchema } from "../../../../lib/store";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function GET(request: Request) {
  try {
    await ensureSchema(env.DB);
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "头像不存在" }, { status: 404 });
    const user = await env.DB.prepare("SELECT avatar_key AS avatarKey FROM users WHERE id = ?").bind(id).first<{ avatarKey: string | null }>();
    if (!user?.avatarKey) return Response.json({ error: "头像不存在" }, { status: 404 });
    const object = await env.MEDIA.get(user.avatarKey);
    if (!object) return Response.json({ error: "头像不存在" }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    // A user can replace an avatar while keeping the same public endpoint.
    // Never let the browser or an intermediary reuse the previous image bytes.
    headers.set("cache-control", "no-store, max-age=0");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    return authErrorResponse(error, "读取头像失败");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireSessionUser(env, request);
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File) || !file.size || file.size > MAX_AVATAR_BYTES) throw new Error("头像大小应在 2 MB 以内");
    const extension = TYPES[file.type];
    if (!extension) throw new Error("头像仅支持 JPG、PNG 或 WebP");
    const contents = await file.arrayBuffer();
    if (!hasValidSignature(file.type, new Uint8Array(contents))) throw new Error("头像文件内容与格式不匹配");
    const previous = await env.DB.prepare("SELECT avatar_key AS avatarKey FROM users WHERE id = ?").bind(user.id).first<{ avatarKey: string | null }>();
    const key = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key, contents, { httpMetadata: { contentType: file.type } });
    await env.DB.prepare("UPDATE users SET avatar_key = ?, updated_at = ? WHERE id = ?").bind(key, new Date().toISOString(), user.id).run();
    if (previous?.avatarKey && previous.avatarKey !== key) await env.MEDIA.delete(previous.avatarKey);
    return Response.json({ avatarUrl: `/api/profile/avatar?id=${user.id}&v=${encodeURIComponent(key.split("/").at(-1) || key)}` });
  } catch (error) {
    return authErrorResponse(error, "上传头像失败");
  }
}
