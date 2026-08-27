import { deletePlace, updatePlace } from "@/db/queries";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { placeInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, placeInputSchema);
    const place = await updatePlace(id, input);

    if (!place) return fail("Place not found", 404);

    await broadcast(REALTIME.events.placesChanged, { id });
    // Matches show the place name, so the pitch and the table change too.
    await broadcast(REALTIME.events.matchesChanged, { placeId: id });
    await broadcast(REALTIME.events.lineupChanged, { placeId: id });

    return json(place);
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const removed = await deletePlace(id);

    if (!removed) return fail("Place not found", 404);

    // Matches that pointed here keep existing with no place attached.
    await broadcast(REALTIME.events.placesChanged, { id });
    await broadcast(REALTIME.events.matchesChanged, { placeId: id });
    await broadcast(REALTIME.events.lineupChanged, { placeId: id });

    return json({ id });
  });
}
