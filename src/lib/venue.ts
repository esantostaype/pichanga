import type { Match, MatchSummary } from "@/types";

/**
 * Where it is played, in one line: `DeporPlaza Jockey Club · Cancha 4 - F7`.
 *
 * The venue is the half everybody already knows and the pitch is the half
 * nobody remembers, so the two are never shown apart. The separator disappears
 * when the pitch has not been filled in, which is every fixture until the week
 * it is played -- whichever one they manage to book is settled late.
 */
export const whereLabel = (
  match: Pick<Match | MatchSummary, "venue" | "pitch"> | null | undefined,
) => [match?.venue?.name, match?.pitch].filter(Boolean).join(" · ");
