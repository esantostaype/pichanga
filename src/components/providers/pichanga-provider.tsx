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
import type { MatchInput, PlayerInput } from "@/lib/validators";
import type { Match, MatchSummary, Player } from "@/types";

type PichangaState = {
  nextMatch: Match | null;
  players: Player[];
  matches: MatchSummary[];
};

type PichangaContextValue = PichangaState & {
  createPlayer: (input: PlayerInput) => Promise<Player>;
  updatePlayer: (id: string, input: PlayerInput) => Promise<Player>;
  deletePlayer: (id: string) => Promise<void>;
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
        const match = await api.matches.addPlayers(state.nextMatch.id, playerIds);
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
  }, [state, refreshPlayers, refreshMatches, refreshNextMatch]);

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
