import { env } from "cloudflare:workers";
import { getSessionUser } from "../../../lib/auth";
import { dashboard } from "../../../lib/store";

export async function GET(request: Request) {
  const user = await getSessionUser(env, request);
  const view = new URL(request.url).searchParams.get("view");
  const needsReadingData = view === "discover" || (view === "today" && Boolean(user));
  if (!needsReadingData) {
    return Response.json({ sources: [], items: [], totalItems: 0, idea: null, imports: [], itemsLoaded: false, user });
  }
  return Response.json({ ...await dashboard(env, user?.id || null), itemsLoaded: true, user });
}
