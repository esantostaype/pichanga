import { describe, expect, it } from "vitest";

import {
  balanceMoves,
  pickNames,
  planTeams,
  strengthOf,
  teamCountFor,
} from "./teams";
import type { PositionId, SkillId } from "./constants";
import type { Player } from "@/types";

const player = (
  id: string,
  position: PositionId,
  skills: Partial<Record<SkillId, number>> = {},
): Player => ({
  id,
  firstName: id,
  lastName: "Player",
  area: "dev",
  photoUrl: null,
  photoPublicId: null,
  position,
  skills: {
    pace: 3,
    stamina: 3,
    finishing: 3,
    passing: 3,
    defending: 3,
    goalkeeping: 3,
    ...skills,
  },
  createdAt: 0,
});

/** A squad of `count` with skills spread across the whole 1-5 range. */
const squadOf = (count: number, keepers = 0) =>
  Array.from({ length: count }, (_, index) => {
    const position: PositionId =
      index < keepers
        ? "gk"
        : index % 3 === 0
          ? "def"
          : index % 3 === 1
            ? "mid"
            : "fwd";

    // Deterministic but uneven: consecutive players are not consecutive in
    // strength, so the draft has something to actually balance.
    const step = (index * 7) % 5;

    return player(`p${index}`, position, {
      pace: 1 + step,
      stamina: 1 + ((index * 3) % 5),
      finishing: 1 + ((index * 11) % 5),
      passing: 1 + ((index * 5) % 5),
      defending: 1 + ((index * 13) % 5),
      goalkeeping: 1 + ((index * 2) % 5),
    });
  });

const ids = (plan: ReturnType<typeof planTeams>) =>
  plan.teams.map((team) => team.players.map((one) => one.id).sort());

describe("strengthOf", () => {
  it("stays on the 1 to 5 scale", () => {
    const best = player("best", "fwd", {
      pace: 5,
      stamina: 5,
      finishing: 5,
      passing: 5,
      defending: 5,
      goalkeeping: 5,
    });
    const worst = player("worst", "fwd", {
      pace: 1,
      stamina: 1,
      finishing: 1,
      passing: 1,
      defending: 1,
      goalkeeping: 1,
    });

    expect(strengthOf(best)).toBeCloseTo(5);
    expect(strengthOf(worst)).toBeCloseTo(1);
  });

  it("weighs a player by the role, not by everything they can do", () => {
    // Cannot finish to save their life, but wins everything at the back.
    const stopper = player("stopper", "def", { defending: 5, finishing: 1 });

    expect(strengthOf(stopper, "def")).toBeGreaterThan(
      strengthOf(stopper, "fwd"),
    );
  });
});

describe("teamCountFor", () => {
  it("makes two teams out of a single pitchful", () => {
    expect(teamCountFor(14, 7)).toBe(2);
    expect(teamCountFor(10, 5)).toBe(2);
  });

  it("turns an overflowing turnout into a triangular", () => {
    // Twenty on a seven-a-side pitch: three teams taking turns, not two teams
    // and six people watching.
    expect(teamCountFor(20, 7)).toBe(3);
    expect(teamCountFor(24, 7)).toBe(4);
    expect(teamCountFor(30, 7)).toBe(5);
  });

  it("never puts more on a side than the pitch holds", () => {
    // The one that started this: two teams would be seven against eight.
    expect(teamCountFor(15, 7)).toBe(3);
    expect(teamCountFor(11, 5)).toBe(3);
    expect(teamCountFor(13, 6)).toBe(3);

    for (const size of [5, 6, 7, 9, 11]) {
      for (let count = 4; count <= 40; count += 1) {
        const teams = teamCountFor(count, size);
        // A side of one is the only thing that outranks the pitch.
        if (teams < Math.floor(count / 2)) {
          expect(Math.ceil(count / teams)).toBeLessThanOrEqual(size);
        }
      }
    }
  });

  it("never leaves a team on its own", () => {
    expect(teamCountFor(3, 7)).toBe(1);
    expect(teamCountFor(5, 7)).toBe(2);
  });
});

describe("planTeams", () => {
  it("uses everybody, once", () => {
    const squad = squadOf(20, 3);
    const plan = planTeams(squad, { teamSize: 7 });

    const placed = plan.teams.flatMap((team) => team.players.map((p) => p.id));

    expect(placed.sort()).toEqual(squad.map((p) => p.id).sort());
    expect(new Set(placed).size).toBe(squad.length);
  });

  it("shares the squad out as evenly as it divides", () => {
    const plan = planTeams(squadOf(20, 3), { teamSize: 7 });

    expect(plan.teams.map((team) => team.players.length)).toEqual([7, 7, 6]);
  });

  it("gives every team a keeper when there are enough volunteers", () => {
    const plan = planTeams(squadOf(20, 3), { teamSize: 7 });

    for (const team of plan.teams) {
      expect(team.keeperId).not.toBeNull();
      expect(team.borrowedKeeper).toBe(false);
      expect(team.players.some((one) => one.id === team.keeperId)).toBe(true);
    }
  });

  it("borrows a keeper when nobody else volunteers", () => {
    const squad = [
      player("keeper", "gk", { goalkeeping: 5 }),
      // The only two with hands. One is a defender, which is the tie-break.
      player("hands-def", "def", { goalkeeping: 4 }),
      player("hands-fwd", "fwd", { goalkeeping: 4 }),
      ...squadOf(15).map((one) => ({
        ...one,
        position: "mid" as const,
        skills: { ...one.skills, goalkeeping: 1 },
      })),
    ];

    const plan = planTeams(squad, { teamSize: 6, teamCount: 3 });
    const borrowed = plan.teams.filter((team) => team.borrowedKeeper);

    expect(borrowed).toHaveLength(2);
    expect(plan.teams.map((team) => team.keeperId).sort()).toEqual(
      ["hands-def", "hands-fwd", "keeper"].sort(),
    );
    // The volunteer is never the borrowed one.
    expect(
      plan.teams.find((team) => team.keeperId === "keeper")?.borrowedKeeper,
    ).toBe(false);
  });

  it("plays a spare keeper out of goal", () => {
    const squad = [
      player("gk-a", "gk", { goalkeeping: 5 }),
      player("gk-b", "gk", { goalkeeping: 4 }),
      player("gk-c", "gk", { goalkeeping: 3 }),
      ...squadOf(9).map((one) => ({ ...one, position: "mid" as const })),
    ];

    const plan = planTeams(squad, { teamSize: 6, teamCount: 2 });
    const keepers = plan.teams.map((team) => team.keeperId);

    expect(keepers).toHaveLength(2);
    // The third keeper is still on a team, just not between the posts.
    expect(keepers).not.toContain("gk-c");
    expect(
      plan.teams.flatMap((team) => team.players.map((one) => one.id)),
    ).toContain("gk-c");
  });

  it("closes the gap between the teams", () => {
    const plan = planTeams(squadOf(20, 3), { teamSize: 7 });

    // A fifth of a point apart on a five-point scale: closer than the noise in
    // the ratings themselves.
    expect(plan.spread).toBeLessThan(0.2);
  });

  it("is at least as fair as the draft that feeds it", () => {
    const squad = squadOf(18, 2);

    // Teams handed out in strength order, with no swapping afterwards, is the
    // naive way to do this and the thing to beat.
    const naive = planTeams(squad, { teamSize: 9, teamCount: 2 });

    expect(naive.spread).toBeLessThan(0.35);
  });

  it("plans the same way twice", () => {
    const squad = squadOf(20, 3);

    expect(ids(planTeams(squad, { teamSize: 7, seed: 7 }))).toEqual(
      ids(planTeams(squad, { teamSize: 7, seed: 7 })),
    );
  });

  it("still fills every team when the squad barely covers them", () => {
    const plan = planTeams(squadOf(4, 1), { teamSize: 5 });

    expect(plan.teams).toHaveLength(2);
    expect(plan.teams.every((team) => team.players.length === 2)).toBe(true);
    expect(plan.teams.every((team) => team.keeperId !== null)).toBe(true);
  });

  it("has nothing to say about an empty squad", () => {
    const plan = planTeams([], { teamSize: 7 });

    expect(plan.teams.flatMap((team) => team.players)).toHaveLength(0);
    expect(plan.spread).toBe(0);
  });
});

describe("planTeams with mixAreas", () => {
  /** Eight from one floor and four from another: the stacking to undo. */
  const lopsided = () => [
    ...Array.from({ length: 8 }, (_, index) =>
      player(`dev${index}`, index % 3 === 0 ? "def" : "mid", {
        pace: 1 + (index % 5),
        defending: 1 + ((index * 3) % 5),
      }),
    ).map((one) => ({ ...one, area: "dev" })),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`des${index}`, index % 2 === 0 ? "fwd" : "mid", {
        pace: 1 + ((index * 2) % 5),
        finishing: 1 + ((index * 4) % 5),
      }),
    ).map((one) => ({ ...one, area: "design" })),
  ];

  const spreadOfAreas = (plan: ReturnType<typeof planTeams>, area: string) =>
    plan.teams.map(
      (team) => team.players.filter((one) => one.area === area).length,
    );

  it("shares out the smaller floor rather than stacking it", () => {
    const squad = lopsided();

    const mixed = planTeams(squad, { teamSize: 6, mixAreas: true });

    // Four Design across two teams: two each, not three and one.
    expect(spreadOfAreas(mixed, "design").sort()).toEqual([2, 2]);
    expect(spreadOfAreas(mixed, "dev").sort()).toEqual([4, 4]);
  });

  it("does not buy the mix with a lopsided match", () => {
    const squad = lopsided();

    const plain = planTeams(squad, { teamSize: 6 });
    const mixed = planTeams(squad, { teamSize: 6, mixAreas: true });

    // Fairness first: mixing may cost a little, never a lot.
    expect(mixed.spread).toBeLessThan(0.35);
    expect(mixed.spread - plain.spread).toBeLessThan(0.3);
  });

  it("leaves the teams alone when it is asked not to mix", () => {
    const squad = lopsided();

    expect(ids(planTeams(squad, { teamSize: 6, seed: 3 }))).toEqual(
      ids(planTeams(squad, { teamSize: 6, seed: 3 })),
    );
  });

  it("still gives every team a keeper while mixing", () => {
    const squad = [
      ...lopsided(),
      { ...player("gk1", "gk", { goalkeeping: 5 }), area: "guest" },
      { ...player("gk2", "gk", { goalkeeping: 4 }), area: "guest" },
    ];

    const plan = planTeams(squad, { teamSize: 7, mixAreas: true });

    expect(plan.teams.every((team) => team.keeperId !== null)).toBe(true);
    expect(plan.teams.every((team) => !team.borrowedKeeper)).toBe(true);
  });
});

describe("pickNames", () => {
  it("gives every side a name of its own", () => {
    for (let count = 2; count <= 6; count += 1) {
      for (const seed of [0, 1, 2, 3, 7, 12, 99, 1234]) {
        const picked = pickNames(count, seed);

        expect(picked).toHaveLength(count);
        expect(new Set(picked.map((one) => one.name)).size).toBe(count);
      }
    }
  });

  it("finishes when the step and the pool share a factor", () => {
    // The bug this covers: three steps into a pool of six visits two names for
    // ever, and the loop filling four sides from it never came back -- the
    // request hung and the server sat there holding it.
    const picked = pickNames(4, 3);

    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((one) => one.name)).size).toBe(4);
  });

  it("keeps naming sides after the pool runs out", () => {
    const picked = pickNames(9, 5);

    expect(picked).toHaveLength(9);
    expect(new Set(picked.map((one) => one.name)).size).toBe(9);
  });

  it("gives a name the same colour every time", () => {
    const first = pickNames(6, 1);
    const later = pickNames(6, 40);

    for (const team of first) {
      const again = later.find((one) => one.name === team.name);
      expect(again?.accent).toBe(team.accent);
    }
  });
});

describe("balanceMoves", () => {
  const side = (id: string, count: number, from = 0) => ({
    id,
    players: Array.from({ length: count }, (_, index) => ({
      id: `${id}-${index}`,
      strength: 2 + ((from + index) % 3),
      isKeeper: index === 0,
    })),
  });

  it("leaves level sides alone", () => {
    expect(balanceMoves([side("a", 5), side("b", 5)])).toEqual([]);
    // One apart is level enough: somebody has to be the odd number.
    expect(balanceMoves([side("a", 6), side("b", 5)])).toEqual([]);
  });

  it("turns four against six into five each", () => {
    const moves = balanceMoves([side("a", 6), side("b", 4)]);

    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe("a");
    expect(moves[0].to).toBe("b");
  });

  it("keeps going until nothing is more than one apart", () => {
    const sides = [side("a", 8), side("b", 3), side("c", 4)];
    const moves = balanceMoves(sides);

    const sizes = new Map(sides.map((one) => [one.id, one.players.length]));
    for (const move of moves) {
      sizes.set(move.from, sizes.get(move.from)! - 1);
      sizes.set(move.to, sizes.get(move.to)! + 1);
    }

    const counts = [...sizes.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("never moves a keeper", () => {
    const sides = [side("a", 7), side("b", 3)];
    const keepers = new Set(
      sides.flatMap((one) =>
        one.players.filter((p) => p.isKeeper).map((p) => p.id),
      ),
    );

    for (const move of balanceMoves(sides)) {
      expect(keepers.has(move.playerId)).toBe(false);
    }
  });

  it("comes back even when a side is nothing but its keeper", () => {
    // The guard this covers: nobody may move, so there is no move to make and
    // no way to make the numbers work. It has to return, not spin.
    const stuck = [
      { id: "a", players: [{ id: "gk", strength: 3, isKeeper: true }] },
      { id: "b", players: [] },
      {
        id: "c",
        players: Array.from({ length: 6 }, (_, index) => ({
          id: `c-${index}`,
          strength: 3,
          isKeeper: index === 0,
        })),
      },
    ];

    expect(Array.isArray(balanceMoves(stuck))).toBe(true);
  });
});
