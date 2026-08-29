import {
  assertPlayersExist,
  createMatch,
  listMatches,
  placeExists,
} from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { matchInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const demo = new URL(request.url).searchParams.get("demo") === "1";
  return route(async () => json(await listMatches(demo)));
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await readJson(request, matchInputSchema);

    if (!(await assertPlayersExist(input.playerIds))) {
      return fail("One of the selected players no longer exists", 422);
    }

    if (!(await placeExists(input.placeId))) {
      return fail("The selected place no longer exists", 422);
    }

    const match = await createMatch(input);

    await broadcast(REALTIME.events.matchesChanged, { id: match.id });
    await broadcast(REALTIME.events.lineupChanged, { matchId: match.id });

    return json(match, 201);
  });
}
