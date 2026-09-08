import type { Match, MatchSummary } from "@/types";

/**
 * Where it is played, as one string: `DeporPlaza Jockey Club · Cancha 4 - F7`.
 *
 * For the shared card and the WhatsApp text, which have one line and no
 * markup to put the two halves on. On screen they are stacked instead, so the
 * maps link can stop at the venue -- the pitch is not a page Google can open.
 *
 * The separator disappears when the pitch has not been filled in, which is
 * every fixture until the week it is played.
 */
export const whereLabel = (
  match: Pick<Match | MatchSummary, "venue" | "pitch"> | null | undefined,
) => [match?.venue?.name, match?.pitch].filter(Boolean).join(" · ");
