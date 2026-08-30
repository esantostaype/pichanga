import { clearTeams, drawTeams, getMatch, getMatchLive } from "@/db/queries";
import { REALTIME, TEAMS_OPEN_MS } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { teamDrawInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Draws the sides.
 *
 * Open two hours before kick-off and not a minute earlier: before that the
 * lineup is still moving, and teams drawn from half a squad are worth nothing.
 * The window is checked here as well as in the button, because a button is a
 * suggestion and this is the rule.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const { seed, mixAreas } = await readJson(request, teamDrawInputSchema);

    const current = await getMatch(id);
    if (!current) return fail("Match not found", 404);

    if (Date.now() < current.playedAt - TEAMS_OPEN_MS) {
      return fail("The teams are drawn two hours before kick-off", 409);
    }

    if (current.players.length < 4) {
      return fail("There are not enough players for two sides", 422);
    }

    /*
     * Once a game has been played the sides are what they are. Drawing them
     * again is not a redraw, it is a delete: the games and the goals hang off
     * the team rows and go with them, and the night's table with them.
     */
    const live = await getMatchLive(id);
    if (live.games.length > 0) {
      return fail("The night has started; the sides stand", 409);
    }

    const match = await drawTeams(id, seed, mixAreas ?? false);
    if (!match) return fail("Match not found", 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json(match, 201);
  });
}

/** Back to one squad. Behind the session: undoing a draw is not everyone's. */
export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;

    // Same as a redraw, and for the same reason: the night hangs off these
    // rows. Putting the sides away after a game would take it with them.
    const live = await getMatchLive(id);
    if (live.games.length > 0) {
      return fail("The night has started; the sides stand", 409);
    }

    const match = await clearTeams(id);
    if (!match) return fail("Match not found", 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json(match);
  });
}
