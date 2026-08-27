"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useRealtime } from "@/hooks/use-realtime";
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
  /** False when the server has no password configured: sign-in is hidden. */
  authEnabled: boolean;
};

type PichangaContextValue = PichangaState & {
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  createPlayer: (input: PlayerInput) => Promise<Player>;
  updatePlayer: (id: string, input: PlayerInput) => Promise<Player>;
  deletePlayer: (id: string) => Promise<void>;
  createPlace: (input: PlaceInput) => Promise<Place>;
  updatePlace: (id: string, input: PlaceInput) => Promise<Place>;
  deletePlace: (id: string) => Promise<void>;
  createMatch: (input: MatchInput) => Promise<Match>;
  updateMatch: (id: string, input: MatchInput) => Promise<Match>;
  deleteMatch: (id: string) => Promise<void>;
  addPlayersToNextMatch: (playerIds: string[]) => Promise<void>;
  removePlayerFromNextMatch: (playerId: string) => Promise<void>;
};

const PichangaContext = createContext<PichangaContextValue | null>(null);

export function PichangaProvider({
  initial,
  children,
}: {
  initial: PichangaState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PichangaState>(initial);

  const patch = useCallback(
    (next: Partial<PichangaState>) => setState((prev) => ({ ...prev, ...next })),
    [],
  );

  const refreshPlayers = useCallback(
    async () => patch({ players: await api.players.list() }),
    [patch],
  );

  const refreshPlaces = useCallback(
    async () => patch({ places: await api.places.list() }),
    [patch],
  );

  const refreshMatches = useCallback(
    async () => patch({ matches: await api.matches.list() }),
    [patch],
  );

  const refreshNextMatch = useCallback(
    async () => patch({ nextMatch: await api.matches.next() }),
    [patch],
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
  });

  const value = useMemo<PichangaContextValue>(() => {
    /** Applies a mutation result to the match currently on screen. */
    const syncNextMatch = (match: Match) =>
      setState((prev) =>
        prev.nextMatch?.id === match.id ? { ...prev, nextMatch: match } : prev,
      );

    return {
      ...state,

      login: async (password) => {
        await api.auth.login(password);
        patch({ isAdmin: true });
        // Admin-only data was never fetched for a guest, so pull it now.
        await Promise.all([refreshPlaces(), refreshMatches()]);
      },

      logout: async () => {
        await api.auth.logout();
        patch({ isAdmin: false });
      },

      createPlayer: async (input) => {
        const player = await api.players.create(input);
        await refreshPlayers();
        return player;
      },

      updatePlayer: async (id, input) => {
        const player = await api.players.update(id, input);
        await Promise.all([refreshPlayers(), refreshNextMatch()]);
        return player;
      },

      deletePlayer: async (id) => {
        await api.players.remove(id);
        await Promise.all([
          refreshPlayers(),
          refreshMatches(),
          refreshNextMatch(),
        ]);
      },

      createPlace: async (input) => {
        const place = await api.places.create(input);
        await refreshPlaces();
        return place;
      },

      updatePlace: async (id, input) => {
        const place = await api.places.update(id, input);
        await Promise.all([
          refreshPlaces(),
          refreshMatches(),
          refreshNextMatch(),
        ]);
        return place;
      },

      deletePlace: async (id) => {
        await api.places.remove(id);
        await Promise.all([
          refreshPlaces(),
          refreshMatches(),
          refreshNextMatch(),
        ]);
      },

      createMatch: async (input) => {
        const match = await api.matches.create(input);
        await Promise.all([refreshMatches(), refreshNextMatch()]);
        return match;
      },

      updateMatch: async (id, input) => {
        const match = await api.matches.update(id, input);
        await Promise.all([refreshMatches(), refreshNextMatch()]);
        return match;
      },

      deleteMatch: async (id) => {
        await api.matches.remove(id);
        await Promise.all([refreshMatches(), refreshNextMatch()]);
      },

      addPlayersToNextMatch: async (playerIds) => {
        if (!state.nextMatch) throw new Error("There is no active match");
        const match = await api.matches.addPlayers(
          state.nextMatch.id,
          playerIds,
        );
        syncNextMatch(match);
        await refreshMatches();
      },

      removePlayerFromNextMatch: async (playerId) => {
        if (!state.nextMatch) throw new Error("There is no active match");
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
    patch,
    refreshPlayers,
    refreshPlaces,
    refreshMatches,
    refreshNextMatch,
  ]);

  return (
    <PichangaContext.Provider value={value}>{children}</PichangaContext.Provider>
  );
}

export function usePichanga() {
  const context = useContext(PichangaContext);
  if (!context) {
    throw new Error("usePichanga must be used inside <PichangaProvider>");
  }
  return context;
}
