import { describe, expect, it } from "vitest";

import { LOW_STAMINA, loanCandidates, loanHeroes, shortBy } from "./loans";
import type {
  MatchGame,
  MatchGoal,
  MatchLoan,
  MatchTeam,
  Player,
} from "@/types";

const bornAgo = (age: number) => `${new Date().getFullYear() - age}-01-01`;

const player = (id: string, level: number, stamina = 4): Player => ({
  id,
  firstName: id,
  lastName: "P",
  birthDate: bornAgo(28),
  photoUrl: null,
  photoPublicId: null,
  position: "mid",
  skills: {
    pace: level,
    stamina,
    finishing: level,
    passing: level,
    defending: level,
    goalkeeping: 2,
  },
  createdAt: 0,
});

const team = (id: string, ids: string[]): MatchTeam => ({
  id,
  slot: 0,
  name: id,
  accent: "#c6f432",
  playerIds: ids,
  keeperId: null,
  borrowedKeeper: false,
});

const game: MatchGame = {
  id: "g1",
  slot: 0,
  homeTeamId: "a",
  awayTeamId: "d",
  startedAt: 0,
  endedAt: null,
};

// Seven, seven, seven and six: D is the short one, and plays A first.
const players = [
  ...["a1", "a2", "a3", "a4", "a5", "a6", "a7"].map((id) => player(id, 3)),
  ...["b1", "b2", "b3", "b4", "b5", "b6", "b7"].map((id, index) =>
    player(id, 1 + (index % 5), index === 0 ? LOW_STAMINA : 4),
  ),
  ...["c1", "c2", "c3", "c4", "c5", "c6", "c7"].map((id, index) =>
    player(id, 1 + ((index + 2) % 5)),
  ),
  ...["d1", "d2", "d3", "d4", "d5", "d6"].map((id) => player(id, 3)),
];

const teams = [
  team("a", ["a1", "a2", "a3", "a4", "a5", "a6", "a7"]),
  team("b", ["b1", "b2", "b3", "b4", "b5", "b6", "b7"]),
  team("c", ["c1", "c2", "c3", "c4", "c5", "c6", "c7"]),
  team("d", ["d1", "d2", "d3", "d4", "d5", "d6"]),
];

describe("shortBy", () => {
  it("says the six is one down against a seven, until somebody is lent", () => {
    expect(shortBy(teams[3], game, teams, [])).toBe(1);
    expect(shortBy(teams[0], game, teams, [])).toBe(0);

    const loan: MatchLoan = { id: "l", slot: 0, teamId: "d", playerId: "b2" };
    expect(shortBy(teams[3], game, teams, [loan])).toBe(0);
  });
});

describe("loanCandidates", () => {
  const list = loanCandidates({ team: teams[3], game, teams, loans: [], players });

  it("only offers players from the sides sitting the game out", () => {
    expect(list.every((one) => ["b", "c"].includes(one.from.id))).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(4);
  });

  it("leaves out tired legs", () => {
    expect(list.some((one) => one.player.id === "b1")).toBe(false);
  });

  it("puts the one who evens the sides first", () => {
    // D is six threes against seven threes: another three closes it exactly.
    expect(list[0].gap).toBeCloseTo(0);
    expect(list[0].player.skills.pace).toBe(3);
  });
});

describe("loanCandidates and what is at stake", () => {
  const played = (id: string, home: string, away: string): MatchGame => ({
    id,
    slot: 0,
    homeTeamId: home,
    awayTeamId: away,
    startedAt: 0,
    endedAt: 1,
  });
  const scored = (gameId: string, teamId: string): MatchGoal => ({
    id: `${gameId}-${teamId}`,
    gameId,
    teamId,
    playerId: "x",
    scoredAt: 0,
  });

  it("offers the side furthest off the lead first", () => {
    // B beat C earlier: B is chasing the pot, C is not.
    const list = loanCandidates({
      team: teams[3],
      game,
      teams,
      loans: [],
      players,
      games: [played("g0", "b", "c")],
      goals: [scored("g0", "b")],
    });

    expect(list[0].from.id).toBe("c");
    expect(list[0].behind).toBe(3);
    expect(list.at(-1)?.from.id).toBe("b");
  });
});

describe("loans before kick-off", () => {
  // The next game has no row yet: just its sides and the slot it will take.
  const upcoming: MatchGame = { ...game, id: "next", slot: 4 };

  it("counts a loan agreed for the next game, and only for it", () => {
    const early: MatchLoan = { id: "l", slot: 4, teamId: "d", playerId: "b2" };

    expect(shortBy(teams[3], upcoming, teams, [early])).toBe(0);
    expect(shortBy(teams[3], game, teams, [early])).toBe(1);
  });
});

describe("loanHeroes", () => {
  const done: MatchGame = { ...game, endedAt: 1 };
  const loan: MatchLoan = { id: "l", slot: 0, teamId: "d", playerId: "b2" };
  const goal = (teamId: string, playerId: string, id: string): MatchGoal => ({
    id,
    gameId: "g1",
    teamId,
    playerId,
    scoredAt: 0,
  });

  it("names the lent player when their borrowed side won", () => {
    const heroes = loanHeroes([loan], [done], [
      goal("d", "b2", "1"),
      goal("d", "d1", "2"),
      goal("a", "a1", "3"),
    ]);

    expect(heroes).toEqual([{ playerId: "b2", teamId: "d", goals: 1 }]);
  });

  it("leaves them out when the side lost or the game is still on", () => {
    expect(loanHeroes([loan], [done], [goal("a", "a1", "1")])).toEqual([]);
    expect(loanHeroes([loan], [game], [goal("d", "b2", "1")])).toEqual([]);
  });
});
