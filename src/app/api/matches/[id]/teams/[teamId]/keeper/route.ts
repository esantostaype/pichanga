import { getMatch, getMatchLive, setKeeper } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { currentGame } from "@/lib/live";
import { broadcast } from "@/lib/pusher/server";
import { keeperInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; teamId: string }> };

/**
 * Puts somebody in goal, by hand.
 *
 * The app names a keeper for every side and is right most of the time, but it
 * cannot know whose knee hurts or who has spent the last three weeks refusing.
 *
 * **Not while a game is on, with three sides or more.** A side that changes
 * keeper mid-game is a side reshuffling in front of the two waiting to come
 * on, and the table is being kept on the result. With two sides there is
 * nobody waiting and nothing to be unfair to, so the gloves can move whenever
 * the two of them agree -- which is how a pickup game actually works.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id, teamId } = await params;
    const { playerId } = await readJson(request, keeperInputSchema);

    const current = await getMatch(id);
    if (!current) return fail((await messages()).matchNotFound, 404);

    if (current.teams.length > 2) {
      const live = await getMatchLive(id);
      if (currentGame(live.games)) {
        return fail((await messages()).glovesStay, 409);
      }
    }

    const match = await setKeeper(id, teamId, playerId);
    if (!match) return fail((await messages()).notOnThatSide, 422);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json(match);
  });
}
