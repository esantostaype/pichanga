import { notFound } from "next/navigation";

import { PichangaProvider } from "@/components/providers/pichanga-provider";
import {
  getHomeMatchId,
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
    /*
     * Every one of these is a round trip to a database on the other side of
     * the network, so they go together rather than one after another. A pinned
     * page loads its own date and only the *id* of the one the front page
     * shows -- it needs no more than that to point a link at "/".
     */
    const [role, players, places, matches, active, homeId] = await Promise.all([
      getRole(),
      listPlayers(),
      listPlaces(),
      listMatches(),
      slug ? getMatchBySlug(slug) : getNextMatch(),
      slug ? getHomeMatchId() : Promise.resolve(null),
    ]);

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
        homeMatchId: slug ? homeId : (active?.id ?? null),
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
