import { env } from "cloudflare:workers";
import { requireImportAccess } from "../_access";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function mediaKey(request: Request) {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]{2,239}$/.test(key) || key.includes("..")) throw new Error("图片路径不合法");
  return key;
}

export async function GET(request: Request) {
  try {
    const object = await env.MEDIA.get(mediaKey(request));
    if (!object) return Response.json({ error: "图片不存在" }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=604800, immutable");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "图片读取失败" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const denied = requireImportAccess(request, env);
    if (denied) return denied;
    const key = mediaKey(request);
    if (await env.MEDIA.head(key)) return Response.json({ ok: true, stored: false });
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_IMAGE_BYTES) throw new Error("单张图片不能超过 10MB");
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("图片大小不合法");
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    if (!/^image\/(?:avif|gif|jpeg|png|webp)$/i.test(contentType)) throw new Error("只支持常见图片格式");
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType } });
    return Response.json({ ok: true, stored: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "图片上传失败" }, { status: 400 });
  }
}
