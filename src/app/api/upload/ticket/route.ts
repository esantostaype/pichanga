import { galleryUploadTicket } from "@/lib/cloudinary";
import { json, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Signs a direct upload to Cloudinary for the match gallery.
 *
 * Open to guests, like the rest of the gallery. The signature only covers the
 * destination folder and a timestamp, so the ticket cannot be turned into
 * anything but "put a file in that folder".
 */
export async function POST() {
  return route(async () => json(galleryUploadTicket()));
}
