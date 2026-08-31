import { removeGoal } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; goalId: string }> };

/**
 * Takes one back off the board: the same hands that put it there.
 *
 * Only while that game is still being played. A goal removed from a game that
 * finished an hour ago rewrites a result the teams already played on, and the
 * table with it.
 */
export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id, goalId } = await params;

    const live = await removeGoal(id, goalId);
    if (!live) return fail((await messages()).gameFinished, 409);

    await broadcast(REALTIME.events.liveChanged, { matchId: id });

    return json(live);
  });
}
