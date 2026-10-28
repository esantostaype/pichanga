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
 * minutes with four sides is twelve of seven -- two full rounds -- rather
 * than ten of nine, where not everybody meets everybody as often.
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
 * `planned` is how many games the night can hold: the ones played, the one on,
 * and as many more of the agreed length as fit before the rental runs out,
 * rounded down to a count where everybody has played as often. It follows the
 * night as it goes -- a late start, an extra half hour, a length changed by
 * hand.
 *
 * `balanced` is true when the games played so far leave a fair table: a whole
 * number of rounds, so every side has played as often as the others and met
 * them as often. `nextStop` is the next count of games where that is true
 * again, for a night that carries on past the plan.
 */
export function nightProgress({
  played,
  inPlay,
  remainingMs,
  gameMinutes,
  teamCount,
}: {
  /** Games finished. */
  played: number;
  /** Whether one is on right now. */
  inPlay: boolean;
  /** Rental left after the game on now -- or from now, between games. */
  remainingMs: number;
  gameMinutes: number;
  teamCount: number;
}) {
  const unit = fairUnit(teamCount);
  const round = fullRound(teamCount);

  const sofar = played + (inPlay ? 1 : 0);
  const more =
    gameMinutes > 0
      ? Math.floor(Math.max(0, remainingMs) / (gameMinutes * 60_000))
      : 0;
  const planned = Math.max(sofar, Math.floor((sofar + more) / unit) * unit);
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

  /** The count of games, stepping by `step`, that runs closest to ten. */
  const closest = (step: number) => {
    let best: { games: number; off: number } | null = null;
    for (let games = step; total / games >= SHORTEST; games += step) {
      const off = Math.abs(total / games - TARGET_GAME_MINUTES);
      if (!best || off < best.off - 1e-9) best = { games, off };
    }
    return best;
  };

  /*
   * Everybody meeting everybody beats everybody merely playing as often, as
   * long as the games stay games: a full round wins when it keeps them within
   * `ROUND_SLACK` minutes of ten. Forty-five minutes with four sides is six
   * games of seven, not four of eleven where somebody never meets somebody.
   */
  const full = closest(round);
  const even = closest(unit);
  const pick =
    full && (full.off <= ROUND_SLACK || !even) ? full : (even ?? full);

  // A match too short for even one fair round: one game of whatever there is.
  if (!pick) {
    return { minutes: Math.max(3, Math.min(total, TARGET_GAME_MINUTES)), games: 1 };
  }

  return { minutes: Math.floor(total / pick.games), games: pick.games };
}

/** How far from ten a full round may run before evenness alone will do. */
const ROUND_SLACK = 3;

/**
 * The plan for whatever is left of the night.
 *
 * A night that kicks off ten minutes late has fifty minutes, not sixty, for
 * the same six games -- so the games get shorter rather than the round going
 * unfinished. Counted from the later of the planned start and `from` (now, or
 * when the first game actually kicked off).
 */
export function planFrom(
  match: { playedAt: number; endsAt: number },
  teamCount: number,
  from: number,
) {
  const start = Math.max(match.playedAt, from);
  return recommendedGamePlan(match.endsAt - start, teamCount);
}

/**
 * The plan for the rest of a night already under way.
 *
 * `played` games are in the table; `remainingMs` is what is left of the
 * rental from the next kick-off. The night should still end on a fair count,
 * so the total is picked among the counts where everybody has played as
 * often -- a full round first, as `recommendedGamePlan` does -- and the games
 * still to play share what is left, as close to ten minutes as it gets.
 *
 * What an extra half hour runs through: an hour of four sides becomes ninety
 * minutes, and the games still to come are cut to fit the twelve.
 */
export function planRest(
  played: number,
  remainingMs: number,
  teamCount: number,
): GamePlan & { total: number } {
  const left = Math.max(0, Math.floor(remainingMs / 60_000));
  const unit = fairUnit(teamCount);
  const round = fullRound(teamCount);

  const closest = (step: number) => {
    let best: { total: number; off: number } | null = null;
    for (
      let total = Math.ceil((played + 1) / step) * step;
      left / (total - played) >= SHORTEST;
      total += step
    ) {
      const off = Math.abs(left / (total - played) - TARGET_GAME_MINUTES);
      if (!best || off < best.off - 1e-9) best = { total, off };
    }
    return best;
  };

  const full = closest(round);
  const even = closest(unit);
  const pick =
    full && (full.off <= ROUND_SLACK || !even) ? full : (even ?? full);

  if (!pick) {
    return { minutes: Math.max(3, Math.min(left, TARGET_GAME_MINUTES)), games: 1, total: played + 1 };
  }

  const games = pick.total - played;
  return { minutes: Math.floor(left / games), games, total: pick.total };
}
