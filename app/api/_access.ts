const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function requirePersonalAccess(request: Request) {
  const url = new URL(request.url);
  if (LOCAL_HOSTS.has(url.hostname)) return null;
  if (request.headers.get("oai-authenticated-user-email")) return null;
  return Response.json({ error: "请先登录后再使用个人情报台" }, { status: 401 });
}

function sameSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function requireImportAccess(request: Request, env: { IMPORT_TOKEN?: string }) {
  const url = new URL(request.url);
  if (LOCAL_HOSTS.has(url.hostname)) return null;
  const expected = env.IMPORT_TOKEN || "";
  const provided = request.headers.get("x-import-token") || "";
  if (sameSecret(provided, expected)) return null;
  return Response.json({ error: "后台同步凭证无效" }, { status: 401 });
}
