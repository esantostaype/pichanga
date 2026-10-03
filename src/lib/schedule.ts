/**
 * How long each game should run so the night ends fair.
 *
 * The pot goes to the top of the table, so the table has to be one where
 * every side has played the same number of games. That happens after a whole
 * number of "fair units" of games:
 *
 *  - two sides: every game, both play;
 *  - three: every three games (A-B, B-C, C-A), each side has played two;
 *  - four: every two games, each side has played one -- and every six, all
 *    of them have met all of the others;
 *  - five or six: winner stays, which never evens out, so any count goes.
 *
 * So the match's length is cut into a number of games that is a multiple of
 * that unit, as close to ten minutes each as it gets: ten is what a Friday
 * game runs. An hour is six games of ten for three sides or four; ninety
 * minutes with four sides is ten games of nine.
 */
export const TARGET_GAME_MINUTES = 10;

/** The shortest game worth recommending. */
const SHORTEST = 5;

export function fairUnit(teamCount: number) {
  if (teamCount === 3) return 3;
  if (teamCount === 4) return 2;
  return 1;
}

/** Games after which everybody has met everybody, where that exists. */
export function fullRound(teamCount: number) {
  if (teamCount === 3) return 3;
  if (teamCount === 4) return 6;
  return 1;
}

/**
 * Where the night stands against the fair plan.
 *
 * `balanced` is true when the games played so far leave a fair table: a whole
 * number of rounds, so every side has played as often as the others and met
 * them as often. `nextStop` is the next count of games where that is true
 * again, for a night that carries on past the plan.
 */
export function nightProgress(
  played: number,
  durationMs: number,
  teamCount: number,
) {
  const planned = recommendedGamePlan(durationMs, teamCount).games;
  const round = fullRound(teamCount);
  const balanced = played > 0 && played % round === 0;

  return {
    planned,
    done: played >= planned,
    balanced,
    nextStop: balanced ? played + round : Math.ceil(played / round) * round,
  };
}

export type GamePlan = {
  /** Whole minutes per game. */
  minutes: number;
  /** How many games that makes in the match. */
  games: number;
};

export function recommendedGamePlan(
  durationMs: number,
  teamCount: number,
): GamePlan {
  const total = Math.max(0, Math.floor(durationMs / 60_000));
  const unit = fairUnit(teamCount);
  const round = fullRound(teamCount);

  let best: GamePlan & { off: number; full: boolean } | null = null;

  for (let games = unit; total / games >= SHORTEST; games += unit) {
    const exact = total / games;
    const off = Math.abs(exact - TARGET_GAME_MINUTES);
    const full = games % round === 0;

    const better =
      !best ||
      off < best.off - 1e-9 ||
      // Level on closeness: the one where everybody has met everybody.
      (Math.abs(off - best.off) < 1e-9 && full && !best.full);

    if (better) best = { minutes: Math.floor(exact), games, off, full };
  }

  // A match too short for even one fair round: one game of whatever there is.
  if (!best) {
    return { minutes: Math.max(3, Math.min(total, TARGET_GAME_MINUTES)), games: 1 };
  }

  return { minutes: best.minutes, games: best.games };
}
