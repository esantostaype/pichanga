import { lendPlayer } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { loanInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Lends somebody to the short side, for the game being played or the one
 * about to start.
 *
 * Open to whoever is at the ground, like the rest of match night: it is
 * settled out loud by the people standing there.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, loanInputSchema);

    const live = await lendPlayer(id, input.slot, input.teamId, input.playerId);

    if (typeof live === "string") {
      return fail((await messages())[live], 409);
    }

    await broadcast(REALTIME.events.liveChanged, { matchId: id });

    return json(live, 201);
  });
}
