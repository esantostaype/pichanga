import { describe, expect, it } from "vitest";

import {
  currentGame,
  gameScore,
  minuteOf,
  nextPairing,
  standings,
  topScorers,
} from "./live";
import type { MatchGame, MatchGoal, MatchTeam } from "@/types";

const team = (id: string, slot: number): MatchTeam => ({
  id,
  slot,
  name: `Team ${id}`,
  accent: "#c6f432",
  playerIds: [],
  keeperId: null,
  borrowedKeeper: false,
});

const A = team("a", 0);
const B = team("b", 1);
const C = team("c", 2);

let clock = 1_000_000;

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
  startedAt: (clock += 600_000),
  endedAt: ended ? clock + 600_000 : null,
});

const goal = (gameId: string, teamId: string, playerId: string): MatchGoal => ({
  id: `${gameId}-${teamId}-${playerId}-${clock++}`,
  gameId,
  teamId,
  playerId,
  scoredAt: clock,
});

describe("currentGame", () => {
  it("is the one still running", () => {
    const games = [game("g1", 0, "a", "b"), game("g2", 1, "a", "c", false)];

    expect(currentGame(games)?.id).toBe("g2");
  });

  it("is nobody between games", () => {
    expect(currentGame([game("g1", 0, "a", "b")])).toBeNull();
  });
});

describe("gameScore", () => {
  it("counts each side's goals in that game alone", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "a", "c");

    const goals = [
      goal("g1", "a", "p1"),
      goal("g1", "a", "p2"),
      goal("g1", "b", "p3"),
      // A goal in the next game must not land on this scoreboard.
      goal("g2", "a", "p1"),
    ];

    expect(gameScore(goals, one)).toEqual({ home: 2, away: 1 });
    expect(gameScore(goals, two)).toEqual({ home: 1, away: 0 });
  });
});

describe("nextPairing", () => {
  it("opens with the first two sides drawn", () => {
    expect(nextPairing([A, B, C], [], [])).toEqual({
      homeTeamId: "a",
      awayTeamId: "b",
    });
  });

  it("sends the loser off and brings the waiting side on", () => {
    const one = game("g1", 0, "a", "b");
    const goals = [goal("g1", "b", "p1")];

    expect(nextPairing([A, B, C], [one], goals)).toEqual({
      homeTeamId: "b",
      awayTeamId: "c",
    });
  });

  it("calls a draw itself, and calls it the same way twice", () => {
    const one = game("g1", 0, "a", "c");
    const two = game("g2", 1, "a", "b");
    const goals = [goal("g1", "a", "p1")];

    const first = nextPairing([A, B, C], [one, two], goals);
    const again = nextPairing([A, B, C], [one, two], goals);

    // One of the two that drew stays; C, who has been waiting, comes on.
    expect(["a", "b"]).toContain(first?.homeTeamId);
    expect(first?.awayTeamId).toBe("c");
    // Read twice, decided once: two phones must not offer different games.
    expect(again).toEqual(first);
  });

  it("does not always send off the same side of a draw", () => {
    // One game, drawn, so nothing but the toss decides who stays. Across a
    // handful of games both sides get to: that is what "the app decides" means.
    const staying = new Set(
      ["d1", "d2", "d3", "d4", "d5", "d6"].map((id) => {
        const drawn: MatchGame = { ...game("x", 0, "a", "b"), id };
        return nextPairing([A, B, C], [drawn], [])?.homeTeamId;
      }),
    );

    expect(staying).toEqual(new Set(["a", "b"]));
  });

  it("still refuses a third game in a row, draw or not", () => {
    // A has played both; the second was drawn. Whatever the toss says, A goes.
    const one = game("g1", 0, "a", "c");
    const two = game("g2", 1, "a", "b");

    expect(nextPairing([A, B, C], [one, two], [goal("g1", "a", "p1")])).toEqual({
      homeTeamId: "b",
      awayTeamId: "c",
    });
  });

  it("brings on whoever has waited longest", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "c", "a");
    const E = team("e", 3);
    const F = team("f", 4);

    // Five sides, so the turn rule applies rather than the four-side rounds.
    // C won the second game and stays; B sat out one, E and F have never
    // played, so the longest wait belongs to E.
    const goals = [goal("g1", "a", "p1"), goal("g2", "c", "p2")];

    expect(nextPairing([A, B, C, E, F], [one, two], goals)).toEqual({
      homeTeamId: "c",
      awayTeamId: "e",
    });
  });

  it("sends a side off after two in a row, however it did", () => {
    // A wins twice: off it goes anyway, and C -- just beaten -- stays on.
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "a", "c");
    const goals = [goal("g1", "a", "p1"), goal("g2", "a", "p1")];

    expect(nextPairing([A, B, C], [one, two], goals)).toEqual({
      homeTeamId: "c",
      awayTeamId: "b",
    });
  });

  it("lets a winner stay for a second but not a third", () => {
    const one = game("g1", 0, "a", "b");
    const goals = [goal("g1", "a", "p1")];

    // One win: A stays.
    expect(nextPairing([A, B, C], [one], goals)).toEqual({
      homeTeamId: "a",
      awayTeamId: "c",
    });
  });

  it("has the same two play again when there is nobody waiting", () => {
    const one = game("g1", 0, "a", "b");

    expect(nextPairing([A, B], [one], [goal("g1", "a", "p1")])).toEqual({
      homeTeamId: "a",
      awayTeamId: "b",
    });
  });

  it("has nothing to pair with one side", () => {
    expect(nextPairing([A], [], [])).toBeNull();
  });
});

describe("nextPairing with four sides", () => {
    const D = team("d", 3);
    const four = [A, B, C, D];

  it("pairs them off two and two", () => {
    expect(nextPairing(four, [], [])).toEqual({
      homeTeamId: "a",
      awayTeamId: "b",
    });

    const one = game("g1", 0, "a", "b");

    expect(nextPairing(four, [one], [goal("g1", "a", "p1")])).toEqual({
      homeTeamId: "c",
      awayTeamId: "d",
    });
  });

  it("puts the winners together, then the losers", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "c", "d");
    const goals = [goal("g1", "b", "p1"), goal("g2", "c", "p2")];

    // B beat A; C beat D.
    expect(nextPairing(four, [one, two], goals)).toEqual({
      homeTeamId: "b",
      awayTeamId: "c",
    });

    const three = game("g3", 2, "b", "c");

    expect(nextPairing(four, [one, two, three], goals)).toEqual({
      homeTeamId: "a",
      awayTeamId: "d",
    });
  });

  it("starts the next round from the round just played", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "c", "d");
    const three = game("g3", 2, "b", "c");
    const four4 = game("g4", 3, "a", "d");

    const goals = [
      goal("g1", "b", "p1"),
      goal("g2", "c", "p2"),
      goal("g3", "b", "p1"),
      goal("g4", "d", "p3"),
    ];

    // Round two was B beating C and D beating A: the winners meet again.
    expect(nextPairing(four, [one, two, three, four4], goals)).toEqual({
      homeTeamId: "b",
      awayTeamId: "d",
    });
  });

  it("sends the winner against one of the pair that drew", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "c", "d");

    // A and B drew; C won its game.
    const goals = [goal("g2", "c", "p1")];

    const next = nextPairing(four, [one, two], goals);
    const drew = [next?.homeTeamId, next?.awayTeamId].filter(
      (id) => id === "a" || id === "b",
    );

    expect(next?.awayTeamId).toBe("c");
    expect(drew).toHaveLength(1);

    // Whoever was not picked plays the other loser next.
    const three = game("g3", 2, next!.homeTeamId, "c");
    const after = nextPairing(four, [one, two, three], goals);

    expect([after?.homeTeamId, after?.awayTeamId].sort()).toEqual(
      [next?.homeTeamId === "a" ? "b" : "a", "d"].sort(),
    );
  });

  it("never leaves a side out for more than a game", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "c", "d");
    const three = game("g3", 2, "a", "c");
    const goals = [goal("g1", "a", "p1"), goal("g2", "c", "p2")];

    const next = nextPairing(four, [one, two, three], goals);

    // The two who lost the opening round are the two who have waited.
    expect([next?.homeTeamId, next?.awayTeamId].sort()).toEqual(["b", "d"]);
  });
});

describe("standings", () => {
  it("counts three for a win and one for a draw", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "a", "c");

    const goals = [
      goal("g1", "a", "p1"),
      goal("g1", "a", "p2"),
      goal("g1", "b", "p3"),
      goal("g2", "a", "p1"),
      goal("g2", "c", "p4"),
    ];

    const table = standings([A, B, C], [one, two], goals);

    expect(table[0]).toMatchObject({
      teamId: "a",
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      goalsFor: 3,
      goalsAgainst: 2,
      points: 4,
    });
    expect(table.find((row) => row.teamId === "c")).toMatchObject({
      drawn: 1,
      points: 1,
    });
  });

  it("leaves the game being played out of the table", () => {
    const running = game("g1", 0, "a", "b", false);

    const table = standings([A, B], [running], [goal("g1", "a", "p1")]);

    expect(table.every((row) => row.played === 0)).toBe(true);
  });

  it("separates equal points by goal difference", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "c", "b");

    // A and C both win; A wins by three, C by one.
    const goals = [
      goal("g1", "a", "p1"),
      goal("g1", "a", "p2"),
      goal("g1", "a", "p3"),
      goal("g2", "c", "p4"),
    ];

    const table = standings([A, B, C], [one, two], goals);

    expect(table.map((row) => row.teamId)).toEqual(["a", "c", "b"]);
  });
});

describe("topScorers", () => {
  it("ranks by goals", () => {
    const goals = [
      goal("g1", "a", "p1"),
      goal("g1", "a", "p1"),
      goal("g1", "b", "p2"),
    ];

    expect(topScorers(goals)).toEqual([
      { playerId: "p1", goals: 2 },
      { playerId: "p2", goals: 1 },
    ]);
  });
});

describe("minuteOf", () => {
  it("counts from the kick-off of that game", () => {
    const one = game("g1", 0, "a", "b");
    const scored = { ...goal("g1", "a", "p1"), scoredAt: one.startedAt + 90_000 };

    expect(minuteOf(scored, one)).toBe(2);
  });

  it("calls the first seconds the first minute, not the zeroth", () => {
    const one = game("g1", 0, "a", "b");
    const scored = { ...goal("g1", "a", "p1"), scoredAt: one.startedAt + 1_000 };

    expect(minuteOf(scored, one)).toBe(1);
  });
});
