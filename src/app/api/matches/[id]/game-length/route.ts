import { getMatch, setGameMinutes } from "@/db/queries";
import { INDEFINITE_GAME, REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { gameLengthInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * How long a game runs on this night.
 *
 * Open to everyone, like the rest of match night: it is agreed out loud at the
 * ground by whoever is standing there, and the phone that types it in is
 * whichever one is out of a pocket.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const { minutes } = await readJson(request, gameLengthInputSchema);

    const current = await getMatch(id);
    if (!current) return fail("Match not found", 404);

    // A game with no clock is a side that never comes off, and with three
    // teams there is always somebody waiting for it to.
    if (minutes === INDEFINITE_GAME && current.teams.length > 2) {
      return fail("Only two sides can play without a clock", 422);
    }

    const match = await setGameMinutes(id, minutes);
    if (!match) return fail("Match not found", 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json(match);
  });
}
