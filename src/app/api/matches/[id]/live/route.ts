import { getMatchLive } from "@/db/queries";
import { json, route } from "@/lib/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** The games and the goals. Reading them is open to everyone, like the pitch. */
export async function GET(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return json(await getMatchLive(id));
  });
}
