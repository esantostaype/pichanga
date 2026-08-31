import { notFound } from "next/navigation";

import { PichangaProvider } from "@/components/providers/pichanga-provider";
import {
  ensureDemo,
  getHomeMatchId,
  getMatchBySlug,
  getNextMatch,
  listMatches,
  listPlaces,
  listPlayers,
} from "@/db/queries";
import { getDictionary } from "@/i18n/server";
import { getRole, isAuthConfigured } from "@/lib/session";
import type { Match, MatchSummary, Place, Player } from "@/types";
import { AppShell } from "./app-shell";
import { SetupNotice } from "./setup-notice";

export type ScreenState = {
  nextMatch: Match | null;
  players: Player[];
  places: Place[];
  matches: MatchSummary[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  authEnabled: boolean;
  pinnedMatchId: string | null;
  homeMatchId: string | null;
  demo: boolean;
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
/**
 * Everything a screen needs, in one round of queries.
 *
 * Exported because match night wants the same state: it is the same app on the
 * same match, so the menu, the album and the share sheet all work there without
 * a second way of loading them.
 */
export async function loadScreenState(
  slug?: string,
  demo = false,
): Promise<{ data: ScreenState } | { error: string } | { missing: true }> {
  try {
    /*
     * Every one of these is a round trip to a database on the other side of
     * the network, so they go together rather than one after another. A pinned
     * page loads its own date and only the *id* of the one the front page
     * shows -- it needs no more than that to point a link at "/".
     */
    /*
     * The sandbox is seeded on the way in rather than by a script somebody has
     * to remember to run: a demo that is one visit away from existing is a
     * demo that is always there.
     */
    if (demo) await ensureDemo();

    const [role, players, places, matches, active, homeId] = await Promise.all([
      getRole(),
      listPlayers(demo),
      listPlaces(demo),
      listMatches(demo),
      slug && !demo ? getMatchBySlug(slug) : getNextMatch(demo),
      slug && !demo ? getHomeMatchId() : Promise.resolve(null),
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
        pinnedMatchId: slug && !demo ? (active?.id ?? null) : null,
        homeMatchId: slug && !demo ? homeId : (active?.id ?? null),
        demo,
      },
    };
  } catch (error) {
    console.error("[screen] could not load the initial state", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : (await getDictionary()).common.unknownError,
    };
  }
}

export async function MatchScreen({
  slug,
  demo,
}: {
  slug?: string;
  /** The sandbox: the same app, over rows nobody plays on. */
  demo?: boolean;
}) {
  const initial = await loadScreenState(slug, demo);

  if ("missing" in initial) notFound();
  if ("error" in initial) return <SetupNotice detail={initial.error} />;

  return (
    <PichangaProvider initial={initial.data}>
      <AppShell />
    </PichangaProvider>
  );
}
