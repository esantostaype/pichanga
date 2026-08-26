import { removePlayerFromMatch } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; playerId: string }> };

/** Drops a player from the lineup (their profile is kept). */
export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id, playerId } = await params;
    const match = await removePlayerFromMatch(id, playerId);

    if (!match) return fail("Match not found", 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });
    await broadcast(REALTIME.events.matchesChanged, { id });

    return json(match);
  });
}
