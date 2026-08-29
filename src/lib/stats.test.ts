import { describe, expect, it } from "vitest";

import { buildStats, type StatsSource } from "./stats";
import type { MatchGame, MatchGoal, MatchTeam } from "@/types";

const team = (id: string, slot: number): MatchTeam => ({
  id,
  slot,
  name: `Team ${id.toUpperCase()}`,
  accent: "#c6f432",
  playerIds: [],
  keeperId: null,
  borrowedKeeper: false,
});

const game = (
  id: string,
  slot: number,
  homeTeamId: string,
  awayTeamId: string,
  ended = true,
): MatchGame => ({
  id,
  slot,
  homeTeamId,
  awayTeamId,
  startedAt: 1_000_000 + slot * 600_000,
  endedAt: ended ? 1_000_000 + slot * 600_000 + 600_000 : null,
});

let ticks = 0;

const goal = (gameId: string, teamId: string, playerId: string): MatchGoal => ({
  id: `${gameId}-${playerId}-${(ticks += 1)}`,
  gameId,
  teamId,
  playerId,
  scoredAt: 1_000_000 + ticks,
});

/**
 * One night: A and B play, A wins 2-1, then A and C draw 0-0.
 * Squads are one player each, which keeps the arithmetic readable.
 */
const night = (): StatsSource => ({
  matches: [
    {
      id: "m1",
      playedAt: 1_000_000,
      lineup: [
        { playerId: "ana", teamId: "a" },
        { playerId: "beto", teamId: "b" },
        { playerId: "caro", teamId: "c" },
        // Turned up, never got a side: the draw happened without them.
        { playerId: "dani", teamId: null },
      ],
      teams: [team("a", 0), team("b", 1), team("c", 2)],
      games: [game("g1", 0, "a", "b"), game("g2", 1, "a", "c")],
      goals: [
        goal("g1", "a", "ana"),
        goal("g1", "a", "ana"),
        goal("g1", "b", "beto"),
      ],
    },
  ],
});

describe("buildStats", () => {
  it("counts a match for everyone in the lineup", () => {
    const stats = buildStats(night());

    expect(stats.players.map((row) => row.playerId).sort()).toEqual([
      "ana",
      "beto",
      "caro",
      "dani",
    ]);
    expect(
      stats.players.every((row) => row.matches === 1),
    ).toBe(true);
  });

  it("counts games, not matches, for the record", () => {
    const stats = buildStats(night());
    const by = (id: string) => stats.players.find((row) => row.playerId === id)!;

    // A played twice: won one, drew one. B and C played once each.
    expect(by("ana")).toMatchObject({
      games: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      points: 4,
      goals: 2,
    });
    expect(by("beto")).toMatchObject({ games: 1, lost: 1, points: 0, goals: 1 });
    expect(by("caro")).toMatchObject({ games: 1, drawn: 1, points: 1 });
  });

  it("gives nothing to somebody who never got a side", () => {
    const stats = buildStats(night());
    const dani = stats.players.find((row) => row.playerId === "dani")!;

    expect(dani).toMatchObject({ matches: 1, games: 0, points: 0, goals: 0 });
  });

  it("leaves a game that is still being played out of the record", () => {
    const source = night();
    source.matches[0].games = [
      game("g1", 0, "a", "b"),
      game("g2", 1, "a", "c", false),
    ];

    const stats = buildStats(source);
    const ana = stats.players.find((row) => row.playerId === "ana")!;

    // Only the finished one counts: the draw has not happened yet.
    expect(ana).toMatchObject({ games: 1, won: 1, drawn: 0, points: 3 });
  });

  it("ranks by goals, then points", () => {
    const stats = buildStats(night());

    expect(stats.players[0].playerId).toBe("ana");
    expect(stats.players.map((row) => row.goals)).toEqual([2, 1, 0, 0]);
  });

  it("summarises the night itself", () => {
    const [match] = buildStats(night()).matches;

    expect(match).toMatchObject({ matchId: "m1", games: 2, goals: 3 });
    expect(match.teams.map((row) => row.name)).toEqual([
      "Team A",
      "Team C",
      "Team B",
    ]);
    expect(match.topScorer).toEqual({ playerId: "ana", goals: 2 });
  });

  it("has no top scorer on a goalless night", () => {
    const source = night();
    source.matches[0].goals = [];

    expect(buildStats(source).matches[0].topScorer).toBeNull();
  });

  it("puts the newest night first", () => {
    const source = night();
    source.matches.push({
      ...source.matches[0],
      id: "m2",
      playedAt: 2_000_000,
      goals: [],
      games: [],
    });

    expect(buildStats(source).matches.map((row) => row.matchId)).toEqual([
      "m2",
      "m1",
    ]);
  });

  it("adds a second night to the same players", () => {
    const source = night();
    source.matches.push({
      ...source.matches[0],
      id: "m2",
      playedAt: 2_000_000,
      games: [game("g3", 0, "a", "b")],
      goals: [goal("g3", "b", "beto")],
    });

    const stats = buildStats(source);
    const beto = stats.players.find((row) => row.playerId === "beto")!;

    expect(beto).toMatchObject({ matches: 2, games: 2, goals: 2, won: 1, lost: 1 });
  });

  it("has nothing to say about a season with no matches", () => {
    expect(buildStats({ matches: [] })).toEqual({ players: [], matches: [] });
  });
});
