import { removePlayerFromMatch, setPlayerPaid } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { paymentInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; playerId: string }> };

/**
 * Marks this player's share of the rental as paid, or unpaid.
 *
 * Not in the proxy's guest list, so it needs the session: the ledger belongs
 * to whoever is collecting.
 */
export async function PATCH(request: Request, { params }: Context) {
  return route(async () => {
    const { id, playerId } = await params;
    const { paid } = await readJson(request, paymentInputSchema);

    const result = await setPlayerPaid(id, playerId, paid);

    if (!result.ok) {
      return result.reason === "organizer"
        ? fail((await messages()).organizerSettled, 422)
        : fail((await messages()).notInMatch, 404);
    }

    const { match } = result;

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });
    await broadcast(REALTIME.events.matchesChanged, { id });

    return json(match);
  });
}

/** Drops a player from the lineup (their profile is kept). */
export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id, playerId } = await params;
    const match = await removePlayerFromMatch(id, playerId);

    if (!match) return fail((await messages()).matchNotFound, 404);

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });
    await broadcast(REALTIME.events.matchesChanged, { id });

    return json(match);
  });
}
