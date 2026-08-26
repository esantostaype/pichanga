import { getNextMatch } from "@/db/queries";
import { json, route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Match that owns the main screen: the closest one to be played. */
export async function GET() {
  return route(async () => json(await getNextMatch()));
}
