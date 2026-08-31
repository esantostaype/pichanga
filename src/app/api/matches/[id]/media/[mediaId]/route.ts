import { deleteMatchMedia } from "@/db/queries";
import { messages } from "@/i18n/server";
import { deleteMedia } from "@/lib/cloudinary";
import { REALTIME } from "@/lib/constants";
import { fail, json, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; mediaId: string }> };

/** Removes a photo or clip. Behind the session: memories are easy to lose. */
export async function DELETE(_request: Request, { params }: Context) {
  return route(async () => {
    const { id, mediaId } = await params;
    const removed = await deleteMatchMedia(id, mediaId);

    if (!removed) return fail((await messages()).fileNotInGallery, 404);

    // The row is already gone, so a Cloudinary failure only leaves an orphan
    // file behind, never a broken thumbnail.
    await deleteMedia(removed.publicId, removed.kind);
    await broadcast(REALTIME.events.mediaChanged, { matchId: id });

    return json({ ok: true });
  });
}
