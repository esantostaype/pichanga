import { extendMatch } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { extendInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Half an hour more on the pitch, or half an hour back.
 *
 * Open to whoever is at the ground, like the rest of match night: it is the
 * group deciding out loud to stay on, and the venue that takes the money.
 */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const { minutes } = await readJson(request, extendInputSchema);

    const result = await extendMatch(id, minutes);

    if (typeof result === "string") {
      const says = await messages();
      if (result === "missing") return fail(says.matchNotFound, 404);
      if (result === "closed") return fail(says.nightClosed, 409);
      if (result === "playing") return fail(says.extendBetweenGames, 409);
      return fail(says.extendTooShort, 409);
    }

    await broadcast(REALTIME.events.lineupChanged, { matchId: id });
    await broadcast(REALTIME.events.matchesChanged, { id });

    return json(result);
  });
}
