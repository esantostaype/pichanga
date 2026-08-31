import { finishMatch } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * The last whistle of the night.
 *
 * Blows the current game dead and moves the match's end to now, so the app
 * stops offering another game and the fixture reads as played. Open to whoever
 * is there, like the rest of match night -- and reversible from the match form,
 * which is why it does not ask twice.
 */
export async function POST(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;

    const match = await finishMatch(id);
    if (!match) return fail((await messages()).matchNotFound, 404);

    await broadcast(REALTIME.events.liveChanged, { matchId: id });
    await broadcast(REALTIME.events.matchesChanged, { id });

    return json(match);
  });
}
