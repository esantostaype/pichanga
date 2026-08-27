import { AppShell } from "@/components/layout/app-shell";
import { SetupNotice } from "@/components/layout/setup-notice";
import { PichangaProvider } from "@/components/providers/pichanga-provider";
import {
  getNextMatch,
  listMatches,
  listPlaces,
  listPlayers,
} from "@/db/queries";
import type { Match, MatchSummary, Place, Player } from "@/types";

export const dynamic = "force-dynamic";

type InitialState = {
  nextMatch: Match | null;
  players: Player[];
  places: Place[];
  matches: MatchSummary[];
};

/**
 * Initial state for the first render. If the database does not answer we
 * return the error instead of propagating it: the app shows the setup guide.
 */
async function loadInitialState(): Promise<
  { data: InitialState } | { error: string }
> {
  try {
    const [nextMatch, players, places, matches] = await Promise.all([
      getNextMatch(),
      listPlayers(),
      listPlaces(),
      listMatches(),
    ]);

    return { data: { nextMatch, players, places, matches } };
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
