import { createPlayer, listPlayers } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { playerInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return route(async () => json(await listPlayers(isDemo(request))));
}

/** `?demo=1` reads the sandbox instead of the real rows. */
function isDemo(request: Request) {
  return new URL(request.url).searchParams.get("demo") === "1";
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await readJson(request, playerInputSchema);
    const player = await createPlayer(input);

    if (!player) return fail((await messages()).couldNotCreatePlayer, 500);

    await broadcast(REALTIME.events.playersChanged, { id: player.id });

    return json(player, 201);
  });
}
