import { getMatch, startGame } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { gameInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Kicks a game off.
 *
 * Open to everyone, like the rest of the night: it happens on a pitch with
 * twenty people standing on it, and whoever has their phone out does it.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const { homeTeamId, awayTeamId } = await readJson(request, gameInputSchema);

    if (homeTeamId === awayTeamId) {
      return fail("A team cannot play itself", 422);
    }

    const match = await getMatch(id);
    if (!match) return fail("Match not found", 404);

    /*
     * Not before kick-off. The teams can be drawn two hours early -- that is
     * standing-around time -- but a game that started before the match did puts
     * a clock on screen that means nothing.
     *
     * The sandbox is exempt: it exists to be played with at four in the
     * afternoon on a Tuesday.
     */
    if (!match.isDemo && Date.now() < match.playedAt) {
      return fail("The match has not kicked off yet", 409);
    }

    const ids = new Set(match.teams.map((team) => team.id));
    if (!ids.has(homeTeamId) || !ids.has(awayTeamId)) {
      return fail("Those teams are not in this match", 422);
    }

    const live = await startGame(id, homeTeamId, awayTeamId);
    await broadcast(REALTIME.events.liveChanged, { matchId: id });

    return json(live, 201);
  });
}
