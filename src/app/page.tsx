import { AppShell } from "@/components/layout/app-shell";
import { SetupNotice } from "@/components/layout/setup-notice";
import { PichangaProvider } from "@/components/providers/pichanga-provider";
import {
  getNextMatch,
  listMatches,
  listPlaces,
  listPlayers,
} from "@/db/queries";
import { getIsAdmin, isAuthConfigured } from "@/lib/session";
import type { Match, MatchSummary, Place, Player } from "@/types";

export const dynamic = "force-dynamic";

type InitialState = {
  nextMatch: Match | null;
  players: Player[];
  places: Place[];
  matches: MatchSummary[];
  isAdmin: boolean;
  authEnabled: boolean;
};

/**
 * Initial state for the first render. If the database does not answer we
 * return the error instead of propagating it: the app shows the setup guide.
 *
 * A guest still needs the players list, since signing someone up is allowed
 * without an account. Matches and places are admin-only panels, so they are
 * only fetched when there is a session.
 */
async function loadInitialState(): Promise<
  { data: InitialState } | { error: string }
> {
  try {
    const isAdmin = await getIsAdmin();

    const [nextMatch, players, places, matches] = await Promise.all([
      getNextMatch(),
      listPlayers(),
      isAdmin ? listPlaces() : Promise.resolve([]),
      isAdmin ? listMatches() : Promise.resolve([]),
    ]);

    return {
      data: {
        nextMatch,
        players,
        places,
        matches,
        isAdmin,
        authEnabled: isAuthConfigured(),
      },
    };
  } catch (error) {
    console.error("[home] could not load the initial state", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function HomePage() {
  const initial = await loadInitialState();

  if ("error" in initial) return <SetupNotice detail={initial.error} />;

  return (
    <PichangaProvider initial={initial.data}>
      <AppShell />
    </PichangaProvider>
  );
}
