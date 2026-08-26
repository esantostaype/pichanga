import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  uploadPlayerPhoto,
} from "@/lib/cloudinary";
import { fail, json, route } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Uploads a player photo and returns the Cloudinary URL. Deleting the previous
 * image is the player route's job, since it knows which one is now unreferenced.
 */
export async function POST(request: Request) {
  return route(async () => {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) return fail("File is missing");

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      return fail("Unsupported format. Use JPG, PNG, WebP or AVIF.", 415);
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return fail(
        `The photo is over the ${MAX_PHOTO_BYTES / 1024 / 1024} MB limit`,
        413,
      );
    }

    return json(await uploadPlayerPhoto(file), 201);
  });
}
