import { addMatchMedia, listMatchMedia } from "@/db/queries";
import { galleryFolder } from "@/lib/cloudinary";
import { REALTIME } from "@/lib/constants";
import { fail, json, readJson, route } from "@/lib/http";
import { broadcast } from "@/lib/pusher/server";
import { mediaInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return json(await listMatchMedia(id));
  });
}

/** Files the browser already uploaded. Anyone may add to the gallery. */
export async function POST(request: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = await readJson(request, mediaInputSchema);

    // The url is already pinned to Cloudinary by the schema; this pins it to
    // *our* folder, so the endpoint cannot be used to file someone else's file.
    if (!input.publicId.startsWith(`${galleryFolder()}/`)) {
      return fail("That file does not belong to this gallery", 422);
    }

    const media = await addMatchMedia(id, input);
    if (!media) return fail("Match not found", 404);

    await broadcast(REALTIME.events.mediaChanged, { matchId: id });

    return json(media, 201);
  });
}
