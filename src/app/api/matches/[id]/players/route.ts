import { addPlayersToMatch, assertPlayersExist, getMatch } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { lineupInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Adds players to the lineup of an existing match. There is no size cap. */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const { playerIds } = await readJson(request, lineupInputSchema);

    const current = await getMatch(id);
    if (!current) return fail("Match not found", 404);

    if (!(await assertPlayersExist(playerIds))) {
      return fail("One of the selected players no longer exists", 422);
    }

    const alreadyIn = new Set(current.players.map((p) => p.id));
    const incoming = playerIds.filter((pid) => !alreadyIn.has(pid));

    const match = await addPlayersToMatch(id, [...new Set(incoming)]);
    if (!match) return fail("Match not found", 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });
    await broadcast(REALTIME.events.matchesChanged, { id });

    return json(match, 201);
  });
}
