import {
  assertPlayersExist,
  deleteMatch,
  getMatch,
  placeExists,
  updateMatch,
} from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { matchInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const match = await getMatch(id);

    return match ? json(match) : fail("Match not found", 404);
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, matchInputSchema);

    if (!(await assertPlayersExist(input.playerIds))) {
      return fail("One of the selected players no longer exists", 422);
    }

    if (!(await placeExists(input.placeId))) {
      return fail("The selected place no longer exists", 422);
    }

    const match = await updateMatch(id, input);
    if (!match) return fail("Match not found", 404);

    await broadcast(REALTIME.events.matchesChanged, { id });
    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json(match);
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const removed = await deleteMatch(id);

    if (!removed) return fail("Match not found", 404);

    await broadcast(REALTIME.events.matchesChanged, { id });
    await broadcast(REALTIME.events.lineupChanged, { matchId: id });

    return json({ id });
  });
}
