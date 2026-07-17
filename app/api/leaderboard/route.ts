import { env } from "cloudflare:workers";
import { leaderboard } from "../../../lib/store";

export async function GET(request: Request) {
  try {
    const period = new URL(request.url).searchParams.get("period") === "yesterday" ? "yesterday" : "today";
    return Response.json(await leaderboard(env, period));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取排行榜失败" }, { status: 400 });
  }
}
