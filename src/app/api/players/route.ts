import { createPlayer, listPlayers } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { playerInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => json(await listPlayers()));
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await readJson(request, playerInputSchema);
    const player = await createPlayer(input);

    if (!player) return fail("Could not create the player", 500);

    await broadcast(REALTIME.events.playersChanged, { id: player.id });

    return json(player, 201);
  });
}
