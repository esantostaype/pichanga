import { describe, expect, it } from "vitest";

import { nightPrize, playerLedger } from "./prize";
import type { MatchGame, MatchGoal, MatchTeam } from "@/types";

const team = (id: string, size: number): MatchTeam => ({
  id,
  slot: 0,
  name: id,
  accent: "#c6f432",
  playerIds: Array.from({ length: size }, (_, index) => `${id}${index}`),
  keeperId: null,
  borrowedKeeper: false,
});

const game = (id: string, home: string, away: string): MatchGame => ({
  id,
  slot: 0,
  homeTeamId: home,
  awayTeamId: away,
  startedAt: 0,
  endedAt: 1,
});

const goal = (gameId: string, teamId: string): MatchGoal => ({
  id: `${gameId}-${teamId}-${Math.random()}`,
  gameId,
  teamId,
  playerId: "p",
  scoredAt: 0,
});

describe("nightPrize", () => {
  const sides = [team("a", 5), team("b", 5), team("c", 5), team("d", 5)];

  it("gives the whole pot to the side on top, split between its players", () => {
    const prize = nightPrize(
      sides,
      [game("g1", "a", "b"), game("g2", "c", "d")],
      [goal("g1", "a"), goal("g2", "c"), goal("g2", "c")],
      5,
    );

    // Twenty players at 5 each. A and C both won: level on points.
    expect(prize.pot).toBe(100);
    expect(prize.winnerIds.sort()).toEqual(["a", "c"]);
    expect(prize.perWinner).toBe(10);
  });

  it("does not let goal difference decide the money", () => {
    const prize = nightPrize(
      sides,
      [game("g1", "a", "b"), game("g2", "c", "d")],
      [goal("g1", "a"), goal("g2", "c"), goal("g2", "c"), goal("g2", "c")],
      5,
    );

    const c = prize.rows.find((row) => row.team.id === "c")!;
    const a = prize.rows.find((row) => row.team.id === "a")!;

    expect(c.place).toBe(1);
    expect(a.place).toBe(1);
    expect(a.prize).toBe(c.prize);
  });

  it("hands one winner everything", () => {
    const prize = nightPrize(
      sides,
      [game("g1", "a", "b"), game("g2", "c", "d"), game("g3", "a", "c")],
      [goal("g1", "a"), goal("g2", "c"), goal("g3", "a")],
      5,
    );

    expect(prize.winnerIds).toEqual(["a"]);
    expect(prize.rows[0].prize).toBe(100);
    expect(prize.rows[0].perPlayer).toBe(20);
    expect(prize.rows.slice(1).every((row) => row.prize === 0)).toBe(true);
  });

  it("names nobody when every side ends level", () => {
    const two = nightPrize([team("a", 4), team("b", 6)], [game("g1", "a", "b")], [], 5);

    expect(two.allLevel).toBe(true);
    expect(two.winnerIds).toEqual([]);
    expect(two.rows.every((row) => row.prize === 0)).toBe(true);

    // Four sides, two games, both drawn: all four on one point.
    const four = nightPrize(
      sides,
      [game("g1", "a", "b"), game("g2", "c", "d")],
      [],
      5,
    );
    expect(four.allLevel).toBe(true);
    expect(four.winnerIds).toEqual([]);
  });

  it("splits by player, so a short side takes less", () => {
    const uneven = [team("a", 4), team("b", 6), team("c", 5)];
    const prize = nightPrize(
      uneven,
      [game("g1", "a", "c"), game("g2", "b", "c")],
      [goal("g1", "a"), goal("g2", "b")],
      5,
    );

    // A and B both won: fifteen players' stakes split between ten.
    expect(prize.perWinner).toBe(7.5);
    expect(prize.rows.find((row) => row.team.id === "a")!.prize).toBe(30);
  });

  it("names no winner before anything is played", () => {
    const prize = nightPrize(sides, [], [], 5);

    expect(prize.winnerIds).toEqual([]);
    expect(prize.perWinner).toBe(0);
  });
});

describe("playerLedger", () => {
  const sides = [team("a", 5), team("b", 5)];
  // A wins: twenty in the pot... ten players at 5 = 50, split between five.
  const prize = nightPrize(sides, [game("g1", "a", "b")], [goal("g1", "a")], 5);

  it("takes the pitch and the bet off a winner's prize", () => {
    const ledger = playerLedger(prize, { rental: 4, paidPlayerIds: ["a0"] });
    const paidWinner = ledger.find((row) => row.playerId === "a0")!;
    const owingWinner = ledger.find((row) => row.playerId === "a1")!;

    // Already squared up: the whole prize. Not yet: 10 less 4 less 5.
    expect(paidWinner.settle).toBe(10);
    expect(owingWinner.settle).toBe(1);
    expect(owingWinner.net).toBe(1);
  });

  it("asks a winner for the difference when the prize is the smaller", () => {
    const ledger = playerLedger(prize, { rental: 7, paidPlayerIds: ["a0"] });
    const paidWinner = ledger.find((row) => row.playerId === "a0")!;
    const owingWinner = ledger.find((row) => row.playerId === "a1")!;

    expect(paidWinner.settle).toBe(10);
    expect(owingWinner.settle).toBe(-2);
    // Either way the night leaves them 10 - 5 - 7 = -2.
    expect(paidWinner.net).toBe(-2);
    expect(owingWinner.net).toBe(-2);
  });

  it("collects the pitch and the bet from a loser", () => {
    const ledger = playerLedger(prize, { rental: 7, paidPlayerIds: ["b0"] });

    expect(ledger.find((row) => row.playerId === "b0")!.settle).toBe(0);
    expect(ledger.find((row) => row.playerId === "b1")!.settle).toBe(-12);
    expect(ledger.find((row) => row.playerId === "b1")!.net).toBe(-12);
  });

  it("charges a no-show the bet, and nothing else", () => {
    const ledger = playerLedger(prize, {
      rental: 7,
      paidPlayerIds: [],
      noShowIds: ["x1"],
    });
    const absent = ledger.find((row) => row.playerId === "x1")!;

    expect(absent.noShow).toBe(true);
    expect(absent.settle).toBe(-5);
    expect(absent.net).toBe(-5);
    expect(ledger.at(-1)?.playerId).toBe("x1");
  });

  it("lists the winners first", () => {
    const ledger = playerLedger(prize, { rental: 0, paidPlayerIds: [] });
    expect(ledger.slice(0, 5).every((row) => row.teamId === "a")).toBe(true);
  });
});

describe("rentalShare", () => {
  it("takes the no-shows' penalties off the pitch before splitting it", async () => {
    const { rentalShare } = await import("./money");
    const match = {
      venue: { price: 100 },
      players: Array.from({ length: 10 }),
      noShows: Array.from({ length: 2 }),
      bet: 5,
    };

    // 100 less two penalties of 5, between the ten who came.
    expect(rentalShare(match)).toBe(9);
    expect(rentalShare({ ...match, noShows: [] })).toBe(10);
  });
});
