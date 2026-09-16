import { getMatchLive, setTeamsManually } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { teamsManualInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * The sides, arranged by hand.
 *
 * Takes the whole arrangement at once rather than a move at a time. Building a
 * side out of fourteen people one request per player is the tedium this exists
 * to remove, and it also means a half-applied arrangement cannot survive a
 * dropped connection: either all of it lands or none of it does.
 *
 * **Not once a game has been played**, for the reason a redraw is not: the
 * table is kept on these sides.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const { sides } = await readJson(request, teamsManualInputSchema);

    const live = await getMatchLive(id);
    if (live.games.length > 0) {
      return fail((await messages()).nightStarted, 409);
    }

    const match = await setTeamsManually(id, sides);

    // The only way this fails is an arrangement that does not account for the
    // lineup exactly once, which the dialog will not let anybody build.
    if (!match) return fail((await messages()).teamsNotInMatch, 422);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json(match);
  });
}
