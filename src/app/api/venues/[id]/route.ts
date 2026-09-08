import { deleteVenue, updateVenue } from "@/db/queries";
import { messages } from "@/i18n/server";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { venueInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, venueInputSchema);
    const venue = await updateVenue(id, input);

    if (!venue) return fail((await messages()).venueNotFound, 404);

    await broadcast(REALTIME.events.venuesChanged, { id });
    // Matches show the venue name, so the pitch and the table change too.
    await broadcast(REALTIME.events.matchesChanged, { venueId: id });
    await broadcast(REALTIME.events.lineupChanged, { venueId: id });

    return json(venue);
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const removed = await deleteVenue(id);

    if (!removed) return fail((await messages()).venueNotFound, 404);

    // Matches that pointed here keep existing with no venue attached.
    await broadcast(REALTIME.events.venuesChanged, { id });
    await broadcast(REALTIME.events.matchesChanged, { venueId: id });
    await broadcast(REALTIME.events.lineupChanged, { venueId: id });

    return json({ id });
  });
}
