import { createPlace, listPlaces } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { placeInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => json(await listPlaces()));
}

export async function POST(request: Request) {
  return route(async () => {
    const input = await readJson(request, placeInputSchema);
    const place = await createPlace(input);

    await broadcast(REALTIME.events.placesChanged, { id: place.id });

    return json(place, 201);
  });
}
