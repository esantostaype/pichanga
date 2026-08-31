"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNow } from "@/hooks/use-now";
import { useRealtime } from "@/hooks/use-realtime";
import { useLocale } from "@/components/providers/locale-provider";
import { fill } from "@/i18n/dictionaries";
import { api } from "@/lib/api-client";
import { REALTIME } from "@/lib/constants";
import type { MatchInput, PlaceInput, PlayerInput } from "@/lib/validators";
import type { Match, MatchSummary, Place, Player } from "@/types";

type PichangaState = {
  nextMatch: Match | null;
  players: Player[];
  places: Place[];
  matches: MatchSummary[];
  /** Whether this visitor holds the admin session. */
  isAdmin: boolean;
  /** The higher role, which also sees the live headcount. */
  isSuperAdmin: boolean;
  /** False when the server has no password configured: sign-in is hidden. */
  authEnabled: boolean;
  /**
   * Set when the screen is pinned to one date rather than following the clock.
   * Refreshes then reload that match instead of asking which one is current.
   */
  pinnedMatchId: string | null;
  /** Which match the front page shows, so links can point at "/" for it. */
  homeMatchId: string | null;
  /**
   * The sandbox.
   *
   * Set on `/demo` and nowhere else. Every read asks for the demo rows and
   * every write marks what it creates as one, so the same components run the
   * same code against a world of their own -- which is the only way a demo is
   * worth having.
   */
  demo: boolean;
};

type PichangaContextValue = PichangaState & {
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  createPlayer: (input: PlayerInput) => Promise<Player>;
  updatePlayer: (id: string, input: PlayerInput) => Promise<Player>;
  /** Takes a list so one row and a bulk selection share the same path. */
  deletePlayers: (ids: string[]) => Promise<void>;
  createPlace: (input: PlaceInput) => Promise<Place>;
  updatePlace: (id: string, input: PlaceInput) => Promise<Place>;
  deletePlaces: (ids: string[]) => Promise<void>;
  createMatch: (input: MatchInput) => Promise<Match>;
  updateMatch: (id: string, input: MatchInput) => Promise<Match>;
  deleteMatches: (ids: string[]) => Promise<void>;
  addPlayersToNextMatch: (playerIds: string[]) => Promise<void>;
  removePlayerFromNextMatch: (playerId: string) => Promise<void>;
  /**
   * Draws the sides for the match on screen, or draws them again.
   *
   * The seed comes from here rather than from the server so that "shuffle
   * again" is a new draw every time, while the same seed always lands on the
   * same teams.
   */
  drawTeams: (seed: number, mixAreas?: boolean) => Promise<void>;
  /** Puts the drawn sides away, back to one squad. */
  clearTeams: () => Promise<void>;
  /** Agrees how long each game runs on the night. */
  setGameMinutes: (minutes: number) => Promise<void>;
  /** Hands one side's gloves to somebody else. */
  setKeeper: (teamId: string, playerId: string) => Promise<void>;
  /** Admin only: ticks a player off the rental ledger. */
  /** Defaults to the match on screen; any other one is named outright. */
  setPlayerPaid: (
    playerId: string,
    paid: boolean,
    matchId?: string,
  ) => Promise<void>;
  /**
   * Bumped whenever a gallery changes anywhere. Galleries fetch their own
   * files, and this is how they hear about it without a second subscription to
   * the realtime channel: unsubscribing one would tear down the other.
   */
  mediaVersion: number;
};

const PichangaContext = createContext<PichangaContextValue | null>(null);

export function PichangaProvider({
  initial,
  children,
}: {
  initial: PichangaState;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const [state, setState] = useState<PichangaState>(initial);
  const [mediaVersion, setMediaVersion] = useState(0);

  const patch = useCallback(
    (next: Partial<PichangaState>) =>
      setState((prev) => ({ ...prev, ...next })),
    [],
  );

  const demo = state.demo;

  const refreshPlayers = useCallback(
    async () => patch({ players: await api.players.list(demo) }),
    [patch, demo],
  );

  const refreshPlaces = useCallback(
    async () => patch({ places: await api.places.list(demo) }),
    [patch, demo],
  );

  const refreshMatches = useCallback(
    async () => patch({ matches: await api.matches.list(demo) }),
    [patch, demo],
  );

  const refreshNextMatch = useCallback(
    async () =>
      patch({
        nextMatch: state.pinnedMatchId
          ? await api.matches.get(state.pinnedMatchId)
          : await api.matches.next(demo),
      }),
    [patch, state.pinnedMatchId, demo],
  );

  // Changes coming from other screens.
  useRealtime({
    [REALTIME.events.playersChanged]: () => {
      void refreshPlayers();
      void refreshNextMatch();
    },
    [REALTIME.events.placesChanged]: () => {
      void refreshPlaces();
    },
    [REALTIME.events.matchesChanged]: () => {
      void refreshMatches();
      void refreshNextMatch();
    },
    [REALTIME.events.lineupChanged]: () => {
      void refreshNextMatch();
    },
    [REALTIME.events.mediaChanged]: () => {
      setMediaVersion((version) => version + 1);
    },
  });

  // When the fixture on screen reaches its final whistle, pull the next one:
  // at 21:05 a 20:00-21:00 match should already have handed over. The ref
  // makes it fire once per match, so a series with nothing after it does not
  // refetch on every tick.
  const now = useNow();
  const rolledOver = useRef<string | null>(null);

  useEffect(() => {
    const current = state.nextMatch;
    if (!current || now === null) return;
    // Pinned to a date: the clock never moves this screen to another match.
    if (state.pinnedMatchId) return;
    if (now < current.endsAt) return;
    if (rolledOver.current === current.id) return;

    rolledOver.current = current.id;
    void refreshNextMatch();
  }, [now, state.nextMatch, state.pinnedMatchId, refreshNextMatch]);

  const value = useMemo<PichangaContextValue>(() => {
    /**
     * Deletes every id, then refreshes once instead of once per row. Uses
     * `allSettled` so one failure does not abandon the rest, and reports how
     * many actually went through.
     */
    const deleteAll = async (
      ids: string[],
      remove: (id: string) => Promise<unknown>,
    ) => {
      const results = await Promise.allSettled(ids.map(remove));
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed) {
        throw new Error(
          fill(t.common.partlyDeleted, {
            done: ids.length - failed,
            total: ids.length,
            failed,
          }),
        );
      }
    };

    /**
     * Writes a ledger straight into local state: the pitch marks and the
     * counter in the fixture list both read from here.
     */
    const applyPaid = (matchId: string, paidPlayerIds: string[]) =>
      setState((prev) => ({
        ...prev,
        nextMatch:
          prev.nextMatch?.id === matchId
            ? { ...prev.nextMatch, paidPlayerIds }
            : prev.nextMatch,
        matches: prev.matches.map((match) =>
          match.id === matchId
            ? { ...match, paidCount: paidPlayerIds.length }
            : match,
        ),
      }));

    /** Writes the agreed game length straight into local state. */
    const applyMinutes = (matchId: string, gameMinutes: number) =>
      setState((prev) =>
        prev.nextMatch?.id === matchId
          ? { ...prev, nextMatch: { ...prev.nextMatch, gameMinutes } }
          : prev,
      );

    /** Applies a mutation result to the match currently on screen. */
    const syncNextMatch = (match: Match) =>
      setState((prev) =>
        prev.nextMatch?.id === match.id ? { ...prev, nextMatch: match } : prev,
      );

    return {
      ...state,
      mediaVersion,

      login: async (password) => {
        // The password decides the role, so the answer is what flips the UI.
        const { isAdmin, isSuperAdmin } = await api.auth.login(password);
        // Every panel is already loaded for guests, so the session only flips
        // what the UI allows.
        patch({ isAdmin, isSuperAdmin });
      },

      logout: async () => {
        await api.auth.logout();
        patch({ isAdmin: false, isSuperAdmin: false });
      },

      createPlayer: async (input) => {
        const player = await api.players.create({ ...input, isDemo: demo });
        await refreshPlayers();
        return player;
      },

      updatePlayer: async (id, input) => {
        input = { ...input, isDemo: demo };
        const player = await api.players.update(id, input);
        await Promise.all([refreshPlayers(), refreshNextMatch()]);
        return player;
      },

      deletePlayers: async (ids) => {
        try {
          await deleteAll(ids, api.players.remove);
        } finally {
          // Refresh even on a partial failure: some rows are already gone.
          await Promise.all([
            refreshPlayers(),
            refreshMatches(),
            refreshNextMatch(),
          ]);
        }
      },

      createPlace: async (input) => {
        const place = await api.places.create({ ...input, isDemo: demo });
        await refreshPlaces();
        return place;
      },

      updatePlace: async (id, input) => {
        input = { ...input, isDemo: demo };
        const place = await api.places.update(id, input);
        await Promise.all([
          refreshPlaces(),
          refreshMatches(),
          refreshNextMatch(),
        ]);
        return place;
      },

      deletePlaces: async (ids) => {
        try {
          await deleteAll(ids, api.places.remove);
        } finally {
          await Promise.all([
            refreshPlaces(),
            refreshMatches(),
            refreshNextMatch(),
          ]);
        }
      },

      createMatch: async (input) => {
        const match = await api.matches.create({ ...input, isDemo: demo });
        await Promise.all([refreshMatches(), refreshNextMatch()]);
        return match;
      },

      updateMatch: async (id, input) => {
        const match = await api.matches.update(id, input);
        await Promise.all([refreshMatches(), refreshNextMatch()]);
        return match;
      },

      deleteMatches: async (ids) => {
        try {
          await deleteAll(ids, api.matches.remove);
        } finally {
          await Promise.all([refreshMatches(), refreshNextMatch()]);
        }
      },

      drawTeams: async (seed, mixAreas = false) => {
        if (!state.nextMatch) throw new Error("common.noActiveMatch");
        syncNextMatch(
          await api.matches.drawTeams(state.nextMatch.id, seed, mixAreas),
        );
      },

      clearTeams: async () => {
        if (!state.nextMatch) throw new Error("common.noActiveMatch");
        syncNextMatch(await api.matches.clearTeams(state.nextMatch.id));
      },

      setKeeper: async (teamId, playerId) => {
        if (!state.nextMatch) throw new Error("common.noActiveMatch");
        syncNextMatch(
          await api.matches.setKeeper(state.nextMatch.id, teamId, playerId),
        );
      },

      setGameMinutes: async (minutes) => {
        const match = state.nextMatch;
        if (!match) throw new Error("common.noActiveMatch");

        // Six people are looking at the same screen agreeing on this; the one
        // pressing it should see it land, not watch a round trip first.
        const before = match.gameMinutes;
        applyMinutes(match.id, minutes);

        try {
          syncNextMatch(await api.matches.setGameMinutes(match.id, minutes));
        } catch (error) {
          applyMinutes(match.id, before);
          throw error;
        }
      },

      addPlayersToNextMatch: async (playerIds) => {
        if (!state.nextMatch) throw new Error("common.noActiveMatch");
        const match = await api.matches.addPlayers(
          state.nextMatch.id,
          playerIds,
        );
        syncNextMatch(match);
        await refreshMatches();
      },

      /**
       * Applied on the spot and only then sent.
       *
       * Somebody hands over the money and the mark has to follow the hand, not
       * the round trip; if the request fails the toast says so and the mark
       * goes back where it was.
       */
      setPlayerPaid: async (playerId, paid, matchId) => {
        const target = matchId ?? state.nextMatch?.id;
        if (!target) throw new Error("common.noActiveMatch");

        /*
         * The optimistic step only applies to the match on screen -- it is the
         * one holding a ledger in local state. Any other date is ticked off
         * from its own dialog, which keeps its own copy.
         */
        const onScreen =
          state.nextMatch?.id === target ? state.nextMatch : null;
        const before = onScreen?.paidPlayerIds;

        if (onScreen && before) {
          applyPaid(
            target,
            paid
              ? [...before.filter((id) => id !== playerId), playerId]
              : before.filter((id) => id !== playerId),
          );
        }

        try {
          const saved = await api.matches.setPaid(target, playerId, paid);
          syncNextMatch(saved);
          await refreshMatches();
        } catch (error) {
          if (onScreen && before) applyPaid(target, before);
          throw error;
        }
      },

      removePlayerFromNextMatch: async (playerId) => {
        if (!state.nextMatch) throw new Error("common.noActiveMatch");
        const match = await api.matches.removePlayer(
          state.nextMatch.id,
          playerId,
        );
        syncNextMatch(match);
        await refreshMatches();
      },
    };
  }, [
    state,
    mediaVersion,
    demo,
    t,
    patch,
    refreshPlayers,
    refreshPlaces,
    refreshMatches,
    refreshNextMatch,
  ]);

  return (
    <PichangaContext.Provider value={value}>
      {children}
    </PichangaContext.Provider>
  );
}

export function usePichanga() {
  const context = useContext(PichangaContext);
  if (!context) {
    throw new Error("usePichanga must be used inside <PichangaProvider>");
  }
  return context;
}
