import { getMatchLive, setPlayerTeam } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { teamPlayerInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; teamId: string }> };

/**
 * Puts one player on this side, taking them off whichever they were on.
 *
 * The draw balances on numbers, which is most of the job and never all of it:
 * it cannot know that those two have to be split up, or that the squad wants
 * one particular duel this week. So the sides it produced stay and the people
 * in them move.
 *
 * **Not once a game has been played.** The same rule a redraw follows, for the
 * same reason: the table is being kept on these sides, and a player who
 * changes shirt halfway through makes the standings a record of nothing.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id, teamId } = await params;
    const { playerId } = await readJson(request, teamPlayerInputSchema);

    const live = await getMatchLive(id);
    if (live.games.length > 0) {
      return fail((await messages()).nightStarted, 409);
    }

    const match = await setPlayerTeam(id, teamId, playerId);
    if (!match) return fail((await messages()).notInMatch, 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json(match);
  });
}
