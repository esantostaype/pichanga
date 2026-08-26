import { deletePlayer, getPlayer, updatePlayer } from "@/db/queries";
import { deletePlayerPhoto } from "@/lib/cloudinary";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { playerInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, playerInputSchema);

    const previous = await getPlayer(id);
    if (!previous) return fail("Player not found", 404);

    const player = await updatePlayer(id, input);
    if (!player) return fail("Player not found", 404);

    // The previous photo is now unreferenced: clean it up in Cloudinary.
    if (
      previous.photoPublicId &&
      previous.photoPublicId !== player.photoPublicId
    ) {
      await deletePlayerPhoto(previous.photoPublicId);
    }

    await broadcast(REALTIME.events.playersChanged, { id });
    // Tokens show photo and area, so the pitch is affected too.
    await broadcast(REALTIME.events.lineupChanged, { playerId: id });

    return json(player);
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const player = await deletePlayer(id);

    if (!player) return fail("Player not found", 404);

    await deletePlayerPhoto(player.photoPublicId);
    await broadcast(REALTIME.events.playersChanged, { id });
    await broadcast(REALTIME.events.lineupChanged, { playerId: id });

    return json({ id });
  });
}
