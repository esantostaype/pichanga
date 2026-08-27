import "server-only";

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/constants";
import { env } from "@/lib/env";

export { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES };

let configured = false;

function client() {
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

export type UploadedPhoto = { url: string; publicId: string };

/**
 * Uploads the photo already cropped to a face-centered square: pitch tokens
 * are circular, so the crop happens once at upload time.
 */
export async function uploadPlayerPhoto(file: File): Promise<UploadedPhoto> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sdk = client();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = sdk.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_UPLOAD_FOLDER,
        resource_type: "image",
        overwrite: true,
        transformation: [
          { width: 512, height: 512, crop: "fill", gravity: "auto:face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error("Cloudinary returned no response"));
          return;
        }
        resolve(response);
      },
    );

    stream.end(buffer);
  });

  return { url: result.secure_url, publicId: result.public_id };
}

export type UploadTicket = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

/**
 * Everything the browser needs to upload straight to Cloudinary.
 *
 * Files go direct rather than through this app on purpose: a serverless
 * request body caps out around 4.5 MB, which no video clears. The secret stays
 * here and only signs the two parameters below, so a client cannot smuggle in
 * extra ones -- Cloudinary rejects any unsigned parameter it receives.
 */
export function galleryUploadTicket(): UploadTicket {
  const sdk = client();
  const folder = env.CLOUDINARY_GALLERY_FOLDER;
  const timestamp = Math.floor(Date.now() / 1000);

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    folder,
    timestamp,
    signature: sdk.utils.api_sign_request(
      { folder, timestamp },
      env.CLOUDINARY_API_SECRET,
    ),
  };
}

/** The folder every gallery upload must land in, for validating what comes back. */
export function galleryFolder() {
  return env.CLOUDINARY_GALLERY_FOLDER;
}

/** Removes a gallery file. Videos live under their own resource type. */
export async function deleteMedia(publicId: string, kind: "image" | "video") {
  try {
    await client().uploader.destroy(publicId, {
      resource_type: kind,
      invalidate: true,
    });
  } catch (error) {
    console.error("[cloudinary] could not delete", publicId, error);
  }
}

/** Deletes the previous image so Cloudinary is not left with orphans. */
export async function deletePlayerPhoto(publicId: string | null | undefined) {
  if (!publicId) return;

  try {
    await client().uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error("[cloudinary] could not delete", publicId, error);
  }
}
