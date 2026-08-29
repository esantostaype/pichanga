import { endGame } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { json, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; gameId: string }> };

/** The final whistle. A game that has already ended stays as it was. */
export async function PATCH(_request: Request, { params }: Context) {
  return route(async () => {
    const { id, gameId } = await params;

    const live = await endGame(id, gameId);
    await broadcast(REALTIME.events.liveChanged, { matchId: id });

    return json(live);
  });
}
