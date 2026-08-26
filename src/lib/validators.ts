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

export const matchInputSchema = z.object({
  playedAt: z.coerce.number().int().positive("Pick a valid date"),
  location: z
    .string()
    .trim()
    .max(80, "At most 80 characters")
    .nullable()
    .optional(),
  /** No upper bound: a match takes as many players as sign up. */
  playerIds: z.array(z.string().min(1)).default([]),
});

export type MatchInput = z.infer<typeof matchInputSchema>;

export const lineupInputSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1, "Pick at least one player"),
});

/** Date (yyyy-MM-dd) + time (HH:mm) -> epoch ms in the browser timezone. */
export function toEpoch(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).getTime();
}
