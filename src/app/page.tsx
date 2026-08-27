import { AppShell } from "@/components/layout/app-shell";
import { SetupNotice } from "@/components/layout/setup-notice";
import { PichangaProvider } from "@/components/providers/pichanga-provider";
import {
  getNextMatch,
  listMatches,
  listPlaces,
  listPlayers,
} from "@/db/queries";
import { getRole, isAuthConfigured } from "@/lib/session";
import type { Match, MatchSummary, Place, Player } from "@/types";

export const dynamic = "force-dynamic";

type InitialState = {
  nextMatch: Match | null;
  players: Player[];
  places: Place[];
  matches: MatchSummary[];
  isAdmin: boolean;
  /** Sees the live headcount. Nobody else is even told it exists. */
  isSuperAdmin: boolean;
  authEnabled: boolean;
};

/**
 * Initial state for the first render. If the database does not answer we
 * return the error instead of propagating it: the app shows the setup guide.
 *
 * Everything is fetched for everyone: a guest can browse the three panels, and
 * the session only decides what they may change.
 */
async function loadInitialState(): Promise<
  { data: InitialState } | { error: string }
> {
  try {
    const [role, nextMatch, players, places, matches] = await Promise.all([
      getRole(),
      getNextMatch(),
      listPlayers(),
      listPlaces(),
      listMatches(),
    ]);

    return {
      data: {
        nextMatch,
        players,
        places,
        matches,
        isAdmin: role !== null,
        isSuperAdmin: role === "superadmin",
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
