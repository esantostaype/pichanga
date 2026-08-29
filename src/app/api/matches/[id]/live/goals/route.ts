import { addGoal } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { goalInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Writes a goal down and tells every phone at the ground about it.
 *
 * Two events go out: one for the boards to redraw themselves, and one that
 * carries the scorer, which is what puts GOL across everybody's screen at the
 * same time.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, goalInputSchema);

    const live = await addGoal(
      id,
      input.gameId,
      input.playerId,
      input.recordedBy ?? null,
    );

    if (!live) return fail("That player is not on a team in this match", 422);

    // The one just written: the state comes back in order, so it is the last.
    const scored = live.goals[live.goals.length - 1];

    await broadcast(REALTIME.events.liveChanged, { matchId: id });
    await broadcast(REALTIME.events.liveGoal, {
      matchId: id,
      playerId: input.playerId,
      goalId: scored?.id ?? null,
    });

    return json(live, 201);
  });
}
