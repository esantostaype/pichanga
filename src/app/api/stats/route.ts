import { getStats } from "@/db/queries";
import { json, route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** The season. Open to everyone, like the pitch and the fixtures. */
export async function GET(request: Request) {
  const demo = new URL(request.url).searchParams.get("demo") === "1";
  return route(async () => json(await getStats(demo)));
}
