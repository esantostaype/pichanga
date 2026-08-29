import { gameScore, standings } from "./live";
import type { MatchGame, MatchGoal, MatchTeam } from "@/types";

/**
 * Everything the numbers are built from, flat.
 *
 * One shape rather than a query per figure: an office plays once a week, so a
 * season is a few hundred rows and the arithmetic is cheaper in memory than the
 * round trips would be. It is also the only way this is testable without a
 * database.
 */
export type StatsSource = {
  matches: Array<{
    id: string;
    playedAt: number;
    /** Whoever was in the lineup, and which side they ended up on. */
    lineup: Array<{ playerId: string; teamId: string | null }>;
    teams: MatchTeam[];
    games: MatchGame[];
    goals: MatchGoal[];
  }>;
};

export type PlayerStat = {
  playerId: string;
  /** Matches they were in the lineup for. */
  matches: number;
  /** Games their side actually played, which a triangular multiplies. */
  games: number;
  goals: number;
  won: number;
  drawn: number;
  lost: number;
  /** Three for a win, one for a draw, over the games they were on for. */
  points: number;
};

export type MatchStat = {
  matchId: string;
  playedAt: number;
  games: number;
  goals: number;
  /** Sides in finishing order, the way the live table shows them. */
  teams: Array<{
    id: string;
    name: string;
    accent: string;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
  /** Whoever scored most that night, with how many. Null for a goalless one. */
  topScorer: { playerId: string; goals: number } | null;
};

export type Stats = {
  players: PlayerStat[];
  matches: MatchStat[];
};

/**
 * The season, from the nights that were actually played.
 *
 * A player's record follows the **games** their side played, not the matches
 * they turned up to: on a triangular evening one team can play three games and
 * another two, and a win is a win in the one you were on the pitch for.
 *
 * Only finished games count. A game still running has no result yet, and
 * calling it a draw until somebody blows the whistle would be a lie that
 * corrects itself minutes later.
 */
export function buildStats(source: StatsSource): Stats {
  const players = new Map<string, PlayerStat>();

  const of = (playerId: string) => {
    const found = players.get(playerId);
    if (found) return found;

    const fresh: PlayerStat = {
      playerId,
      matches: 0,
      games: 0,
      goals: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
    };

    players.set(playerId, fresh);
    return fresh;
  };

  const matches: MatchStat[] = [];

  for (const match of source.matches) {
    for (const entry of match.lineup) of(entry.playerId).matches += 1;

    for (const goal of match.goals) of(goal.playerId).goals += 1;

    // Who was on which side, for the results below.
    const squads = new Map<string, string[]>();
    for (const entry of match.lineup) {
      if (!entry.teamId) continue;
      squads.set(entry.teamId, [...(squads.get(entry.teamId) ?? []), entry.playerId]);
    }

    for (const game of match.games) {
      if (game.endedAt === null) continue;

      const score = gameScore(match.goals, game);
      const sides = [
        { teamId: game.homeTeamId, scored: score.home, against: score.away },
        { teamId: game.awayTeamId, scored: score.away, against: score.home },
      ];

      for (const side of sides) {
        for (const playerId of squads.get(side.teamId) ?? []) {
          const stat = of(playerId);
          stat.games += 1;

          if (side.scored > side.against) {
            stat.won += 1;
            stat.points += 3;
          } else if (side.scored === side.against) {
            stat.drawn += 1;
            stat.points += 1;
          } else {
            stat.lost += 1;
          }
        }
      }
    }

    const table = standings(match.teams, match.games, match.goals);
    const byId = new Map(match.teams.map((team) => [team.id, team]));

    matches.push({
      matchId: match.id,
      playedAt: match.playedAt,
      games: match.games.filter((game) => game.endedAt !== null).length,
      goals: match.goals.length,
      teams: table.map((row) => ({
        id: row.teamId,
        name: byId.get(row.teamId)?.name ?? "",
        accent: byId.get(row.teamId)?.accent ?? "#c6f432",
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
      })),
      topScorer: topScorerOf(match.goals),
    });
  }

  return {
    // Goals first, because that is the column everybody opens this for; then
    // points, then fewest games, so a good night beats a long season of them.
    players: [...players.values()].sort(
      (left, right) =>
        right.goals - left.goals ||
        right.points - left.points ||
        left.games - right.games,
    ),
    matches: matches.sort((left, right) => right.playedAt - left.playedAt),
  };
}

function topScorerOf(goals: MatchGoal[]) {
  const tally = new Map<string, number>();

  for (const goal of goals) {
    tally.set(goal.playerId, (tally.get(goal.playerId) ?? 0) + 1);
  }

  let best: { playerId: string; goals: number } | null = null;

  for (const [playerId, count] of tally) {
    if (!best || count > best.goals) best = { playerId, goals: count };
  }

  return best;
}
