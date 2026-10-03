import { setNoShow } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { noShowInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; playerId: string }> };

/**
 * Marks somebody as signed up and not there, or takes it back.
 *
 * Open to whoever is at the ground, like dropping somebody from the lineup:
 * the people standing there are the ones who know who did not turn up.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id, playerId } = await params;
    const { noShow } = await readJson(request, noShowInputSchema);

    const match = await setNoShow(id, playerId, noShow);
    if (!match) return fail((await messages()).notInMatch, 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });
    await broadcast(REALTIME.events.matchesChanged, { id });

    return json(match);
  });
}
