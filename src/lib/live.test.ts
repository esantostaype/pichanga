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

describe("nextPairing with three sides", () => {
  const three = [A, B, C];

  /** Plays out `count` games of the fixed order, results irrelevant. */
  const playOut = (count: number) => {
    const games: ReturnType<typeof game>[] = [];
    for (let index = 0; index < count; index += 1) {
      const next = nextPairing(three, games, [])!;
      games.push(game(`t${index}`, index, next.homeTeamId, next.awayTeamId));
    }
    return games;
  };

  it("cycles A-B, B-C, C-A whoever wins", () => {
    const pairs = playOut(6).map((one) =>
      [one.homeTeamId, one.awayTeamId].sort().join("-"),
    );

    expect(pairs).toEqual(["a-b", "b-c", "a-c", "a-b", "b-c", "a-c"]);
    expect(nextPairing(three, playOut(1), [goal("t0", "a", "p1")])).toEqual(
      nextPairing(three, playOut(1), [goal("t0", "b", "p1")]),
    );
  });

  it("evens out the games after every three", () => {
    const games = playOut(9);

    for (const side of ["a", "b", "c"]) {
      const count = games.filter(
        (one) => one.homeTeamId === side || one.awayTeamId === side,
      ).length;
      expect(count).toBe(6);
    }
  });

  it("never plays anybody three in a row", () => {
    const games = playOut(12);
    const on = (index: number) => [
      games[index].homeTeamId,
      games[index].awayTeamId,
    ];

    for (let index = 2; index < games.length; index += 1) {
      for (const side of on(index)) {
        expect(on(index - 1).includes(side) && on(index - 2).includes(side)).toBe(
          false,
        );
      }
    }
  });
});

/* Five or six sides: winner stays, never three in a row. */
describe("nextPairing", () => {
  const D = team("d", 3);
  const E = team("e", 4);

  it("opens with the first two sides drawn", () => {
    expect(nextPairing([A, B, C, D, E], [], [])).toEqual({
      homeTeamId: "a",
      awayTeamId: "b",
    });
  });

  it("sends the loser off and brings the waiting side on", () => {
    const one = game("g1", 0, "a", "b");
    const goals = [goal("g1", "b", "p1")];

    expect(nextPairing([A, B, C, D, E], [one], goals)).toEqual({
      homeTeamId: "b",
      awayTeamId: "c",
    });
  });

  it("calls a draw itself, and calls it the same way twice", () => {
    const one = game("g1", 0, "a", "c");
    const two = game("g2", 1, "a", "b");
    const goals = [goal("g1", "a", "p1")];

    const first = nextPairing([A, B, C, D, E], [one, two], goals);
    const again = nextPairing([A, B, C, D, E], [one, two], goals);

    // One of the two that drew stays; D, who has waited longest, comes on.
    expect(["a", "b"]).toContain(first?.homeTeamId);
    expect(first?.awayTeamId).toBe("d");
    // Read twice, decided once: two phones must not offer different games.
    expect(again).toEqual(first);
  });

  it("does not always send off the same side of a draw", () => {
    // One game, drawn, so nothing but the toss decides who stays. Across a
    // handful of games both sides get to: that is what "the app decides" means.
    const staying = new Set(
      ["d1", "d2", "d3", "d4", "d5", "d6"].map((id) => {
        const drawn: MatchGame = { ...game("x", 0, "a", "b"), id };
        return nextPairing([A, B, C, D, E], [drawn], [])?.homeTeamId;
      }),
    );

    expect(staying).toEqual(new Set(["a", "b"]));
  });

  it("still refuses a third game in a row, draw or not", () => {
    // A has played both; the second was drawn. Whatever the toss says, A goes.
    const one = game("g1", 0, "a", "c");
    const two = game("g2", 1, "a", "b");

    expect(
      nextPairing([A, B, C, D, E], [one, two], [goal("g1", "a", "p1")]),
    ).toEqual({
      homeTeamId: "b",
      awayTeamId: "d",
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

    expect(nextPairing([A, B, C, D, E], [one, two], goals)).toEqual({
      homeTeamId: "c",
      awayTeamId: "d",
    });
  });

  it("lets a winner stay for a second but not a third", () => {
    const one = game("g1", 0, "a", "b");
    const goals = [goal("g1", "a", "p1")];

    // One win: A stays.
    expect(nextPairing([A, B, C, D, E], [one], goals)).toEqual({
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

  /** Plays out `count` games of the fixed order, results irrelevant. */
  const playOut = (count: number) => {
    const games: ReturnType<typeof game>[] = [];
    for (let index = 0; index < count; index += 1) {
      const next = nextPairing(four, games, [])!;
      games.push(game(`g${index}`, index, next.homeTeamId, next.awayTeamId));
    }
    return games;
  };

  const pairOf = (one: { homeTeamId: string; awayTeamId: string }) =>
    [one.homeTeamId, one.awayTeamId].sort().join("-");

  const sides = (one: { homeTeamId: string; awayTeamId: string }) => [
    one.homeTeamId,
    one.awayTeamId,
  ];

  it("plays everybody against everybody in each hour of six", () => {
    const pairs = playOut(12).map(pairOf);

    expect(new Set(pairs.slice(0, 6)).size).toBe(6);
    expect(new Set(pairs.slice(6)).size).toBe(6);
  });

  it("gives everybody one game in every pair of games", () => {
    const games = playOut(12);

    for (let index = 0; index < games.length; index += 2) {
      const round = [...sides(games[index]), ...sides(games[index + 1])];
      expect(new Set(round).size).toBe(4);
    }
  });

  it("never plays anybody three in a row, and two in a row once each", () => {
    const games = playOut(12);
    const doubles = new Map<string, number>();

    for (let index = 1; index < games.length; index += 1) {
      for (const side of sides(games[index])) {
        if (!sides(games[index - 1]).includes(side)) continue;
        doubles.set(side, (doubles.get(side) ?? 0) + 1);
        if (index > 1) expect(sides(games[index - 2])).not.toContain(side);
      }
    }

    expect(Math.max(...doubles.values())).toBeLessThanOrEqual(1);
  });

  it("does not care who won", () => {
    const one = game("g1", 0, "a", "b");
    const two = game("g2", 1, "c", "d");

    const bWins = [goal("g1", "b", "p1")];
    const aWins = [goal("g1", "a", "p2")];

    expect(nextPairing(four, [one, two], bWins)).toEqual(
      nextPairing(four, [one, two], aWins),
    );
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
