import { notFound } from "next/navigation";

import { PichangaProvider } from "@/components/providers/pichanga-provider";
import {
  getMatchBySlug,
  getNextMatch,
  listMatches,
  listPlaces,
  listPlayers,
} from "@/db/queries";
import { getRole, isAuthConfigured } from "@/lib/session";
import type { Match, MatchSummary, Place, Player } from "@/types";
import { AppShell } from "./app-shell";
import { SetupNotice } from "./setup-notice";

type ScreenState = {
  nextMatch: Match | null;
  players: Player[];
  places: Place[];
  matches: MatchSummary[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  authEnabled: boolean;
  pinnedMatchId: string | null;
  homeMatchId: string | null;
};

/**
 * The pitch, for one match.
 *
 * Without a slug it shows whatever match owns the moment -- being played, or
 * settling up, or next -- and follows the clock as that changes. With a slug it
 * is pinned to that date, so a future fixture can be filled in and paid off
 * from its own address instead of waiting its turn on the front page.
 *
 * Everything is fetched for everyone: a guest can browse the three panels, and
 * the session only decides what they may change.
 */
async function load(slug?: string): Promise<
  { data: ScreenState } | { error: string } | { missing: true }
> {
  try {
    const [role, players, places, matches, homeMatch] = await Promise.all([
      getRole(),
      listPlayers(),
      listPlaces(),
      listMatches(),
      getNextMatch(),
    ]);

    // The front page follows the clock; a slug pins the screen to one date.
    const active = slug ? await getMatchBySlug(slug) : homeMatch;
    if (slug && !active) return { missing: true };

    return {
      data: {
        nextMatch: active,
        players,
        places,
        matches,
        isAdmin: role !== null,
        isSuperAdmin: role === "superadmin",
        authEnabled: isAuthConfigured(),
        pinnedMatchId: slug ? (active?.id ?? null) : null,
        homeMatchId: homeMatch?.id ?? null,
      },
    };
  } catch (error) {
    console.error("[screen] could not load the initial state", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function MatchScreen({ slug }: { slug?: string }) {
  const initial = await load(slug);

  if ("missing" in initial) notFound();
  if ("error" in initial) return <SetupNotice detail={initial.error} />;

  return (
    <PichangaProvider initial={initial.data}>
      <AppShell />
    </PichangaProvider>
  );
}
