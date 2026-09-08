import { createVenue, listVenues } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { venueInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const demo = new URL(request.url).searchParams.get("demo") === "1";
  return route(async () => json(await listVenues(demo)));
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await readJson(request, venueInputSchema);
    const venue = await createVenue(input);

    await broadcast(REALTIME.events.venuesChanged, { id: venue.id });

    return json(venue, 201);
  });
}
