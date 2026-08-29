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
 * **Three sides (or five, or six).** The winner stays and the loser comes off,
 * and whoever has waited longest comes on -- except that **nobody plays more
 * than two in a row**. A side that has just won twice goes off anyway and the
 * side it beat stays to face the fresh legs, which is the rule almost every
 * triangular is actually played by and the one that stops an evening becoming
 * one team's exercise bike.
 *
 * **Four sides.** They pair off two and two, and then the results decide: the
 * next game is the two winners, and the one after it the two losers. Nobody
 * waits more than a game, and by the end of every round of two everybody has
 * played once.
 *
 * **A draw is settled by the app**, and by nothing anybody at the ground can
 * argue with. On three sides it picks which of the two comes off; on four it
 * picks which of them takes the winners' half, so the next game is the real
 * winner against one of the pair that drew.
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

  if (teams.length === 4) return byRounds(teams, played, goals);

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

/** Two and two, then the winners, then the losers. */
function byRounds(teams: MatchTeam[], played: MatchGame[], goals: MatchGoal[]) {
  const opening = [
    { homeTeamId: teams[0].id, awayTeamId: teams[1].id },
    { homeTeamId: teams[2].id, awayTeamId: teams[3].id },
  ];

  if (played.length < 2) return opening[played.length];

  // The round that has just been completed: its two games decide the next two.
  const round = Math.floor(played.length / 2) - 1;
  const first = played[round * 2];
  const second = played[round * 2 + 1];

  if (!first || !second) return opening[played.length % 2];

  const winners = { homeTeamId: winnerOf(first, goals), awayTeamId: winnerOf(second, goals) };
  const losers = { homeTeamId: loserOf(first, goals), awayTeamId: loserOf(second, goals) };

  return played.length % 2 === 0 ? winners : losers;
}

/**
 * Who won, as far as the next pairing is concerned.
 *
 * A draw has no winner, so the app names one -- which on four sides costs the
 * drawing pair nothing, since both of them are coming off either way. It only
 * decides which of the two faces the side that actually won.
 */
function winnerOf(game: MatchGame, goals: MatchGoal[]) {
  const score = gameScore(goals, game);
  if (score.home > score.away) return game.homeTeamId;
  if (score.away > score.home) return game.awayTeamId;
  return toss(game.id, game.homeTeamId, game.awayTeamId);
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

function loserOf(game: MatchGame, goals: MatchGoal[]) {
  const won = winnerOf(game, goals);
  return won === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
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
