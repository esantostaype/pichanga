import {
  POSITION_WEIGHTS,
  SKILLS,
  SKILL_DEFAULT,
  type PositionId,
} from "./constants";
import { TEAM_NAMES } from "./constants";
import type { Player } from "@/types";

export type PlannedTeam = {
  /** Zero-based, and the order the teams are handed back in. */
  index: number;
  players: Player[];
  /** Whoever goes in goal. Null only when the team has nobody at all. */
  keeperId: string | null;
  /** True when the keeper is a field player filling in, not a volunteer. */
  borrowedKeeper: boolean;
  /** Average strength of the team, on the same 1 to 5 scale as a skill. */
  strength: number;
};

export type TeamPlan = {
  teams: PlannedTeam[];
  /** Gap between the strongest and the weakest team. Lower is fairer. */
  spread: number;
};

/**
 * How strong a player is, on the same 1 to 5 scale as the skills themselves.
 *
 * Weighed by the role they are actually going to play, which is usually the one
 * they picked but not always: a keeper with nowhere to keep is rated as a
 * defender, because that is where they will end up.
 */
export function strengthOf(player: Player, role: PositionId = player.position) {
  const weights = POSITION_WEIGHTS[role];

  return SKILLS.reduce(
    (total, skill) =>
      total + (player.skills[skill.id] ?? SKILL_DEFAULT) * weights[skill.id],
    0,
  );
}

/**
 * How many teams a turnout makes on a given pitch.
 *
 * The pitch decides, not the turnout: a side may never be bigger than what
 * fits on it, so the count is the turnout divided by that and **rounded up**.
 * Fifteen on a seven-a-side pitch is three fives taking turns -- two teams
 * would be seven against eight, and the eighth has nowhere to stand. Twenty is
 * three teams of six or seven, not two with six people watching.
 *
 * Never fewer than two, since there is no match otherwise, and never so many
 * that a team would be down to one player -- which is the only case where a
 * side can still come out bigger than the pitch, and by then the pitch was
 * never the problem.
 */
export function teamCountFor(playerCount: number, teamSize: number) {
  if (playerCount < 4) return 1;

  const wanted = Math.max(2, Math.ceil(playerCount / Math.max(teamSize, 1)));
  return Math.min(wanted, Math.floor(playerCount / 2));
}

/**
 * Splits a squad into balanced teams.
 *
 * Three passes, in this order, because each one only makes sense once the
 * previous is settled:
 *
 *  1. **Goal.** One keeper per team, volunteers first and the best stand-ins
 *     after them. This comes first because it is the hardest constraint: a
 *     perfectly balanced pair of teams where one has nobody in goal is not
 *     balanced, it is unplayable.
 *  2. **The draft.** Everybody else in strength order, snaked across the teams,
 *     so the first pick of one round is the last pick of the next.
 *  3. **The swaps.** Trading players between teams while it keeps closing the
 *     gap. The draft alone leaves a gap the size of one player; this closes
 *     most of what is left.
 *
 * `seed` only decides ties, so the same squad always plans the same way and
 * "shuffle again" is a different seed rather than a different algorithm.
 *
 * `mixAreas` adds a second thing to aim at: nobody's floor stacked on one
 * side. Eight people from Dev and two from Design is four Devs against four
 * Devs however even the strengths look, and the whole point of playing on
 * Wednesday is talking to somebody you do not sit next to. Strength still
 * outweighs it -- the mix is worth about a tenth of a point of it -- so the
 * teams stay fair and stop being departmental.
 */
export function planTeams(
  players: Player[],
  {
    teamSize,
    teamCount,
    seed = 1,
    mixAreas = false,
  }: {
    teamSize: number;
    teamCount?: number;
    seed?: number;
    mixAreas?: boolean;
  },
): TeamPlan {
  const count = Math.max(
    1,
    Math.min(
      teamCount ?? teamCountFor(players.length, teamSize),
      Math.max(1, players.length),
    ),
  );

  const random = mulberry32(seed);
  const sizes = shareOut(players.length, count);
  const squads: Player[][] = Array.from({ length: count }, () => []);
  const keepers: Array<{ id: string; borrowed: boolean }> = [];

  /* --------------------------------- goal -------------------------------- */

  const left = new Set(players.map((player) => player.id));

  const volunteers = players
    .filter((player) => player.position === "gk")
    .sort(compareBy((player) => keeperScore(player), random));

  const standIns = players
    .filter((player) => player.position !== "gk")
    .sort(compareBy((player) => keeperScore(player), random));

  for (let team = 0; team < count; team += 1) {
    if (sizes[team] === 0) continue;

    const volunteer = volunteers.find((player) => left.has(player.id));
    const standIn = volunteer
      ? null
      : standIns.find((player) => left.has(player.id));
    const keeper = volunteer ?? standIn;
    if (!keeper) continue;

    left.delete(keeper.id);
    squads[team].push(keeper);
    keepers[team] = { id: keeper.id, borrowed: !volunteer };
  }

  /* -------------------------------- draft -------------------------------- */

  const outfield = players
    .filter((player) => left.has(player.id))
    .sort(compareBy((player) => strengthOf(player, fieldRole(player)), random));

  let index = 0;
  let forwards = true;

  while (index < outfield.length) {
    const order = forwards
      ? squads.map((_, team) => team)
      : squads.map((_, team) => count - 1 - team);

    let placed = false;

    for (const team of order) {
      if (squads[team].length >= sizes[team]) continue;
      if (index >= outfield.length) break;

      squads[team].push(outfield[index]);
      index += 1;
      placed = true;
    }

    // Every team is full and somebody is still standing there: the sizes were
    // handed out for exactly this many people, so this cannot happen -- but a
    // loop that might not end is worse than a line that never runs.
    if (!placed) break;

    forwards = !forwards;
  }

  /* -------------------------------- swaps -------------------------------- */

  improve(squads, keepers);

  const teams = squads.map<PlannedTeam>((squad, team) => ({
    index: team,
    players: squad,
    keeperId: keepers[team]?.id ?? null,
    borrowedKeeper: keepers[team]?.borrowed ?? false,
    strength: averageStrength(squad, keepers[team]?.id ?? null),
  }));

  return { teams, spread: spreadOf(teams.map((team) => team.strength)) };

  /** A player's role once the goal is settled, which is not always their pick. */
  function fieldRole(player: Player): PositionId {
    // A keeper nobody needs plays at the back, and is rated for it.
    return player.position === "gk" ? "def" : player.position;
  }

  function keeperScore(player: Player) {
    // The goalkeeping skill decides it, with a nudge for defenders: when
    // nobody wants the gloves it is the back line that ends up wearing them.
    return (
      (player.skills.goalkeeping ?? SKILL_DEFAULT) +
      (player.position === "def" ? 0.25 : 0)
    );
  }

  function averageStrength(squad: Player[], keeperId: string | null) {
    if (squad.length === 0) return 0;

    const total = squad.reduce(
      (sum, player) =>
        sum +
        strengthOf(player, player.id === keeperId ? "gk" : fieldRole(player)),
      0,
    );

    return total / squad.length;
  }

  /**
   * Trades pairs of field players between teams while the gap keeps closing.
   *
   * Plain hill climbing: every swap that helps is taken, and it stops when none
   * do. Keepers stay where they are -- moving one would undo the pass that put
   * them there.
   */
  function improve(
    squads: Player[][],
    keepers: Array<{ id: string; borrowed: boolean }>,
  ) {
    const isKeeper = (player: Player, team: number) =>
      keepers[team]?.id === player.id;

    for (let pass = 0; pass < 40; pass += 1) {
      const cost = (state: Player[][]) =>
        spreadOf(
          state.map((squad, team) =>
            averageStrength(squad, keepers[team]?.id ?? null),
          ),
        ) + (mixAreas ? AREA_WEIGHT * areaImbalance(state) : 0);

      let best: { a: number; b: number; i: number; j: number } | null = null;
      let bestSpread = cost(squads);

      for (let a = 0; a < squads.length; a += 1) {
        for (let b = a + 1; b < squads.length; b += 1) {
          for (let i = 0; i < squads[a].length; i += 1) {
            if (isKeeper(squads[a][i], a)) continue;

            for (let j = 0; j < squads[b].length; j += 1) {
              if (isKeeper(squads[b][j], b)) continue;

              swap(squads, a, i, b, j);
              const after = cost(squads);
              swap(squads, a, i, b, j);

              // Ties are left alone: churning the teams for no gain would make
              // the same squad plan differently every time it is asked.
              if (after < bestSpread - 1e-9) {
                bestSpread = after;
                best = { a, b, i, j };
              }
            }
          }
        }
      }

      if (!best) return;
      swap(squads, best.a, best.i, best.b, best.j);
    }
  }

  function swap(
    squads: Player[][],
    a: number,
    i: number,
    b: number,
    j: number,
  ) {
    const held = squads[a][i];
    squads[a][i] = squads[b][j];
    squads[b][j] = held;
  }

  /** Sorts high to low, with the seeded shuffle breaking exact ties. */
  function compareBy(score: (player: Player) => number, rng: () => number) {
    const noise = new Map<string, number>();

    return (left: Player, right: Player) => {
      const gap = score(right) - score(left);
      if (Math.abs(gap) > 1e-9) return gap;

      if (!noise.has(left.id)) noise.set(left.id, rng());
      if (!noise.has(right.id)) noise.set(right.id, rng());

      return noise.get(left.id)! - noise.get(right.id)!;
    };
  }
}

/** How many people each team gets: as even as the number allows. */
function shareOut(total: number, teams: number) {
  const base = Math.floor(total / teams);
  const spare = total % teams;

  return Array.from({ length: teams }, (_, team) =>
    team < spare ? base + 1 : base,
  );
}

/**
 * How lopsided the areas are across the teams.
 *
 * Every head above an even share counts, squared, so one team with four of the
 * same floor scores worse than two teams with two each. Zero is a perfect mix
 * and there is no ceiling, which is why the weight below keeps it in its place.
 */
function areaImbalance(squads: Player[][]) {
  const total = new Map<string, number>();
  for (const squad of squads) {
    for (const player of squad) {
      total.set(player.area, (total.get(player.area) ?? 0) + 1);
    }
  }

  let cost = 0;

  for (const squad of squads) {
    const here = new Map<string, number>();
    for (const player of squad) {
      here.set(player.area, (here.get(player.area) ?? 0) + 1);
    }

    for (const [area, count] of here) {
      const share = (total.get(area) ?? 0) / squads.length;
      const over = count - share;
      if (over > 0) cost += over * over;
    }
  }

  return cost;
}

/**
 * What a swap is judged on: the gap between the teams, plus a little of how
 * badly the areas are stacked.
 *
 * A tenth of a point per unit of imbalance. Enough to break a tie between two
 * equally fair arrangements, never enough to make an unfair one win.
 */
const AREA_WEIGHT = 0.1;

function spreadOf(strengths: number[]) {
  const real = strengths.filter((value) => value > 0);
  if (real.length < 2) return 0;

  return Math.max(...real) - Math.min(...real);
}

/** Small seeded generator, so "shuffle again" is repeatable. */
function mulberry32(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sides beyond the pool are the pool again, numbered. */
const ROUNDS = ["", "II", "III", "IV", "V"];

const gcd = (left: number, right: number): number =>
  right === 0 ? left : gcd(right, left % right);

/**
 * Distinct names for the sides, walked from a point the seed decides.
 *
 * Walking in steps rather than one by one keeps the pairs from always being
 * neighbours in the list -- but a step that shares a factor with the pool walks
 * a circle smaller than the pool. Three into six visits two names and no more,
 * and the loop that was filling four sides from that circle never finished:
 * the request never answered and the server sat there holding it. So the step
 * is nudged until the two are coprime, which makes the walk visit every name
 * before it repeats one.
 *
 * A turnout big enough to need more sides than there are names gets the pool
 * again with a numeral on it, which is still a name nobody else has.
 */
export function pickNames(count: number, seed: number) {
  const pool = TEAM_NAMES;
  if (count <= 0) return [];

  const start = Math.abs(Math.trunc(seed)) % pool.length;

  let step = 1 + (Math.abs(Math.trunc(seed / pool.length)) % 3);
  while (gcd(step, pool.length) !== 1) step += 1;

  return Array.from({ length: count }, (_, index) => {
    const entry = pool[(start + index * step) % pool.length];
    const round = Math.floor(index / pool.length);
    if (round === 0) return { ...entry };

    return {
      ...entry,
      name: `${entry.name} ${ROUNDS[round] ?? round + 1}`,
    };
  });
}
