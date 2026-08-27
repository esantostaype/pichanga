import { z } from "zod";

import { AREA_IDS } from "./constants";

const name = z
  .string()
  .trim()
  .min(2, "At least 2 characters")
  .max(40, "At most 40 characters");

export const playerInputSchema = z.object({
  firstName: name,
  lastName: name,
  area: z.enum(AREA_IDS, { message: "Pick an area" }),
  photoUrl: z.string().url().nullable().optional(),
  photoPublicId: z.string().nullable().optional(),
});

export type PlayerInput = z.infer<typeof playerInputSchema>;

export const placeInputSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(80),
  address: z.string().trim().max(200).nullable().optional(),
  googlePlaceId: z.string().trim().max(200).nullable().optional(),
  mapsUrl: z.string().url("Must be a valid URL").nullable().optional(),
  price: z
    .number()
    .nonnegative("Cannot be negative")
    .max(1_000_000)
    .nullable()
    .optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

export type PlaceInput = z.infer<typeof placeInputSchema>;

export const matchInputSchema = z
  .object({
    playedAt: z.coerce.number().int().positive("Pick a valid date"),
    endsAt: z.coerce.number().int().positive("Pick a valid end time"),
    placeId: z.string().min(1).nullable().optional(),
    organizerId: z.string().min(1).nullable().optional(),
  /** `null` for a one-off fixture. */
  recurrence: z.literal("weekly").nullable().optional(),
    /** No upper bound: a match takes as many players as sign up. */
    playerIds: z.array(z.string().min(1)).default([]),
  })
  .refine((input) => input.endsAt > input.playedAt, {
    message: "The end time must be after the start",
    path: ["endsAt"],
  });

export type MatchInput = z.infer<typeof matchInputSchema>;

export const lineupInputSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1, "Pick at least one player"),
});

export const paymentInputSchema = z.object({ paid: z.boolean() });

/**
 * Metadata for a file the browser has already uploaded to Cloudinary.
 *
 * The urls are pinned to Cloudinary's host: the endpoint is open to guests, so
 * without that check anyone could file an arbitrary link as match media.
 */
const cloudinaryUrl = z
  .string()
  .url("Must be a valid URL")
  .refine((value) => {
    try {
      return new URL(value).host === "res.cloudinary.com";
    } catch {
      return false;
    }
  }, "Must be a Cloudinary URL");

export const mediaInputSchema = z.object({
  publicId: z.string().trim().min(1).max(300),
  url: cloudinaryUrl,
  kind: z.enum(["image", "video"]),
  thumbnailUrl: cloudinaryUrl.nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

export type MediaInput = z.infer<typeof mediaInputSchema>;

/** Date (yyyy-MM-dd) + time (HH:mm) -> epoch ms in the browser timezone. */
export function toEpoch(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).getTime();
}
