import { returnPlayer } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string; slot: string; playerId: string }>;
};

/** Sends a lent player back to their own side. */
export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id, slot, playerId } = await params;

    const number = Number(slot);
    if (!Number.isInteger(number) || number < 0) return fail("Bad slot", 422);

    const live = await returnPlayer(id, number, playerId);
    await broadcast(REALTIME.events.liveChanged, { matchId: id });

    return json(live);
  });
}
