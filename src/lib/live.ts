import type { MatchGame, MatchGoal, MatchTeam } from "@/types";

/** The game being played, if one is. */
export function currentGame(games: MatchGame[]): MatchGame | null {
  return games.find((game) => game.endedAt === null) ?? null;
}

/** Goals for one side in one game. */
export function scoreOf(goals: MatchGoal[], gameId: string, teamId: string) {
  return goals.filter(
    (goal) => goal.gameId === gameId && goal.teamId === teamId,
  ).length;
}

export function gameScore(goals: MatchGoal[], game: MatchGame) {
  return {
    home: scoreOf(goals, game.id, game.homeTeamId),
    away: scoreOf(goals, game.id, game.awayTeamId),
  };
}

/** How many games in a row a side may play before it has to come off. */
export const MAX_IN_A_ROW = 2;

/**
 * Who plays next.
 *
 * Two customs, because two turnouts play differently:
 *
 * **Three sides.** A fixed cycle, A-B, B-C, C-A, so every side plays the same
 * number of games and meets the others equally -- see `byCycle`.
 *
 * **Five or six sides.** The winner stays and the loser comes off,
 * and whoever has waited longest comes on -- except that **nobody plays more
 * than two in a row**. A side that has just won twice goes off anyway and the
 * side it beat stays to face the fresh legs, which is the rule almost every
 * triangular is actually played by and the one that stops an evening becoming
 * one team's exercise bike.
 *
 * **Four sides.** Everybody plays everybody, six games to an hour, and the
 * second hour plays the six again while the table keeps counting -- see
 * `ROUND_ROBIN_OF_FOUR` for the order.
 *
 * **A draw is settled by the app**, and by nothing anybody at the ground can
 * argue with. On three sides it picks which of the two comes off; on four
 * there is nothing to pick, since the order does not depend on results.
 *
 * The pick is drawn from the id of the game that was just played rather than
 * from a live coin toss: unpredictable to everyone standing there, and the same
 * on every phone reading the fixture. A true `Math.random()` would have each
 * device offering a different next game until somebody pressed one.
 */
export function nextPairing(
  teams: MatchTeam[],
  games: MatchGame[],
  goals: MatchGoal[],
): { homeTeamId: string; awayTeamId: string } | null {
  if (teams.length < 2) return null;

  const played = games.filter((game) => game.endedAt !== null);

  if (teams.length === 2) {
    const last = played[played.length - 1];
    return last
      ? { homeTeamId: last.homeTeamId, awayTeamId: last.awayTeamId }
      : { homeTeamId: teams[0].id, awayTeamId: teams[1].id };
  }

  if (teams.length === 3) return byCycle(teams, played);

  if (teams.length === 4) return byRounds(teams, played);

  return byTurns(teams, played, goals);
}

/** Winner stays, loser off, longest wait on -- and never three in a row. */
function byTurns(teams: MatchTeam[], played: MatchGame[], goals: MatchGoal[]) {
  const last = played[played.length - 1];
  if (!last) return { homeTeamId: teams[0].id, awayTeamId: teams[1].id };

  const score = gameScore(goals, last);

  let staying =
    score.home === score.away
      ? // Level: the app calls it.
        toss(last.id, last.homeTeamId, last.awayTeamId)
      : score.home > score.away
        ? last.homeTeamId
        : last.awayTeamId;

  const other =
    staying === last.homeTeamId ? last.awayTeamId : last.homeTeamId;

  /*
   * Two is the limit. The side that has hit it comes off even having won, and
   * the one it just beat takes the pitch instead -- somebody has to be on it,
   * and the alternative is the winner never leaving.
   */
  if (streak(played, staying) >= MAX_IN_A_ROW) {
    staying = streak(played, other) >= MAX_IN_A_ROW ? staying : other;
  }

  const waiting = teams
    .filter((team) => team.id !== last.homeTeamId && team.id !== last.awayTeamId)
    .sort((left, right) => waited(played, right.id) - waited(played, left.id));

  const coming = waiting[0];
  if (!coming) {
    return { homeTeamId: last.homeTeamId, awayTeamId: last.awayTeamId };
  }

  return { homeTeamId: staying, awayTeamId: coming.id };
}

/**
 * Three sides: everybody plays everybody, round and round.
 *
 * Three games make a full round -- A-B, B-C, C-A -- and after every one of
 * them each side has played twice and met both of the others once, so the
 * table is fair after any multiple of three. Somebody always plays two in a
 * row with three sides on one pitch, since any two of the three pairings share
 * a side; in this order it is everybody's turn equally: two on, one off.
 *
 * Fixed rather than winner-stays: with a pot riding on the table, a side that
 * kept winning would also keep playing, and its points would come from more
 * games than everybody else's.
 */
const CYCLE_OF_THREE: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 0],
];

function byCycle(teams: MatchTeam[], played: MatchGame[]) {
  const [home, away] = CYCLE_OF_THREE[played.length % CYCLE_OF_THREE.length];
  return { homeTeamId: teams[home].id, awayTeamId: teams[away].id };
}

/**
 * Four sides: everybody plays everybody, twice over two hours.
 *
 * Six games make a full round, and every pair of games is a round where all
 * four play once -- so after any even number of games the table is fair. An
 * hour of six games is the whole thing; a second hour plays the same six
 * pairings again and the table simply keeps counting.
 *
 * With four sides and one pitch somebody has to play two in a row now and
 * then: two games are only clear of each other when they are the two halves of
 * the same round. This order was searched for so that over the twelve games
 * each side does it exactly once, and nobody ever plays three. The second hour
 * opens with the same round the first one closed on, which is the trick that
 * makes the change of hour free.
 *
 * Fixed rather than driven by results: the winners-against-winners format it
 * replaces meant a side that lost early only ever met losers, and its points
 * were not worth the same as anybody else's.
 */
const ROUND_ROBIN_OF_FOUR: Array<[number, number]> = [
  [0, 1],
  [2, 3],
  [1, 3],
  [0, 2],
  [0, 3],
  [1, 2],
  [0, 3],
  [1, 2],
  [0, 2],
  [1, 3],
  [0, 1],
  [2, 3],
];

function byRounds(teams: MatchTeam[], played: MatchGame[]) {
  const [home, away] =
    ROUND_ROBIN_OF_FOUR[played.length % ROUND_ROBIN_OF_FOUR.length];
  return { homeTeamId: teams[home].id, awayTeamId: teams[away].id };
}

/**
 * One of two, drawn from a string.
 *
 * The string is a game's id, which nobody can see and nobody can steer, so the
 * result is a coin toss to everyone at the ground -- and the same coin toss on
 * every phone, which a real one would not be.
 */
function toss(seed: string, first: string, second: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash % 2 === 0 ? first : second;
}

/** How many games in a row a side has just played. */
function streak(played: MatchGame[], teamId: string) {
  let count = 0;

  for (let index = played.length - 1; index >= 0; index -= 1) {
    const game = played[index];
    if (game.homeTeamId !== teamId && game.awayTeamId !== teamId) break;
    count += 1;
  }

  return count;
}

/** How many games have gone by since a side last played one. */
function waited(played: MatchGame[], teamId: string) {
  for (let index = played.length - 1; index >= 0; index -= 1) {
    const game = played[index];
    if (game.homeTeamId === teamId || game.awayTeamId === teamId) {
      return played.length - 1 - index;
    }
  }

  // Never played: waiting since the start, which beats everyone who has.
  return played.length + 1;
}

export type Standing = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

/**
 * The table, from the games that have finished.
 *
 * Three for a win and one for a draw, ordered by points, then goal difference,
 * then goals scored -- the order every table in football uses, so nobody has to
 * be told how to read it.
 */
export function standings(
  teams: MatchTeam[],
  games: MatchGame[],
  goals: MatchGoal[],
): Standing[] {
  const table = new Map<string, Standing>(
    teams.map((team) => [
      team.id,
      {
        teamId: team.id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    ]),
  );

  for (const game of games) {
    if (game.endedAt === null) continue;

    const home = table.get(game.homeTeamId);
    const away = table.get(game.awayTeamId);
    if (!home || !away) continue;

    const score = gameScore(goals, game);

    home.played += 1;
    away.played += 1;
    home.goalsFor += score.home;
    home.goalsAgainst += score.away;
    away.goalsFor += score.away;
    away.goalsAgainst += score.home;

    if (score.home === score.away) {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    } else if (score.home > score.away) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    }
  }

  return [...table.values()].sort(
    (left, right) =>
      right.points - left.points ||
      right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst) ||
      right.goalsFor - left.goalsFor,
  );
}

/** Who scored, most first. */
export function topScorers(goals: MatchGoal[]) {
  const tally = new Map<string, number>();

  for (const goal of goals) {
    tally.set(goal.playerId, (tally.get(goal.playerId) ?? 0) + 1);
  }

  return [...tally.entries()]
    .map(([playerId, count]) => ({ playerId, goals: count }))
    .sort((left, right) => right.goals - left.goals);
}

/** The minute a goal went in, counted from the kick-off of its own game. */
export function minuteOf(goal: MatchGoal, game: MatchGame | undefined) {
  if (!game) return null;
  return Math.max(1, Math.ceil((goal.scoredAt - game.startedAt) / 60_000));
}
