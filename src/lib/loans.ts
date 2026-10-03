import { gameScore, standings } from "./live";
import { balanceStrength } from "./teams";
import type {
  MatchGame,
  MatchGoal,
  MatchLoan,
  MatchTeam,
  Player,
} from "@/types";

/**
 * Stamina at or below this and a player is not offered as a loan: they are
 * resting between their own games, and lending them out means two in a row
 * for somebody who cannot run one.
 */
export const LOW_STAMINA = 2;

/** How many candidates the list offers when there are that many to offer. */
export const LOAN_CHOICES = 6;

/**
 * Everybody on a side for one game: their own, plus whoever was lent to them.
 *
 * `game` only needs its sides and its `slot`, so the game about to be played
 * -- which has no row yet -- can be passed as the pairing with the next slot.
 */
export function sideFor(team: MatchTeam, game: MatchGame, loans: MatchLoan[]) {
  return [
    ...team.playerIds,
    ...loans
      .filter((loan) => loan.slot === game.slot && loan.teamId === team.id)
      .map((loan) => loan.playerId),
  ];
}

/**
 * How many a side is down against the one it is playing, once loans count.
 *
 * Zero for the bigger side and for two sides the same size. Only ever asked
 * of sides on the pitch: a side sitting a game out is not short of anything.
 */
export function shortBy(
  team: MatchTeam,
  game: MatchGame,
  teams: MatchTeam[],
  loans: MatchLoan[],
) {
  const opponentId =
    game.homeTeamId === team.id
      ? game.awayTeamId
      : game.awayTeamId === team.id
        ? game.homeTeamId
        : null;
  const opponent = teams.find((one) => one.id === opponentId);
  if (!opponent) return 0;

  return Math.max(
    0,
    sideFor(opponent, game, loans).length - sideFor(team, game, loans).length,
  );
}

export type LoanCandidate = {
  player: Player;
  /** The side they normally play for. */
  from: MatchTeam;
  /** The gap left between the two sides if they come on. Lower fits better. */
  gap: number;
  /**
   * Points their own side is behind the leader. The further back, the less it
   * has riding on the game they are lent to.
   */
  behind: number;
};

/**
 * Who could be lent to a short side for this game, best first.
 *
 * Only from the sides sitting it out -- anybody else is on the pitch already --
 * and never somebody with low stamina (`LOW_STAMINA`).
 *
 * **Least to lose first.** A lent player is playing for one rival of their own
 * side against another, with a pot on the table, and a player whose side is
 * chasing first place has every reason to help the borrowing side lose. So the
 * side furthest behind the leader goes first: it has the least riding on who
 * wins this one. Nobody at the ground has to work any of that out -- the list
 * is simply in that order.
 *
 * Within a side, best fit first: whoever leaves the two sides closest in
 * strength, weighed the way the draw weighs them; then the fresher legs.
 */
export function loanCandidates({
  team,
  game,
  teams,
  loans,
  players,
  games = [],
  goals = [],
}: {
  team: MatchTeam;
  game: MatchGame;
  teams: MatchTeam[];
  loans: MatchLoan[];
  players: Player[];
  /** The night so far, to tell who has the most riding on the result. */
  games?: MatchGame[];
  goals?: MatchGoal[];
}): LoanCandidate[] {
  const table = standings(teams, games, goals);
  const leader = Math.max(0, ...table.map((row) => row.points));
  const pointsOf = new Map(table.map((row) => [row.teamId, row.points]));

  const byId = new Map(players.map((player) => [player.id, player]));
  const opponentId =
    game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
  const opponent = teams.find((one) => one.id === opponentId);
  if (!opponent) return [];

  const strength = (ids: string[]) =>
    ids.reduce((total, id) => {
      const player = byId.get(id);
      return player ? total + balanceStrength(player, fieldRole(player)) : total;
    }, 0);

  const ours = strength(sideFor(team, game, loans));
  const theirs = strength(sideFor(opponent, game, loans));

  const lent = new Set(
    loans.filter((loan) => loan.slot === game.slot).map((loan) => loan.playerId),
  );

  return teams
    .filter((side) => side.id !== game.homeTeamId && side.id !== game.awayTeamId)
    .flatMap((side) =>
      side.playerIds.flatMap((id) => {
        const player = byId.get(id);
        if (!player || lent.has(id)) return [];
        if (player.skills.stamina <= LOW_STAMINA) return [];

        const gap = Math.abs(
          ours + balanceStrength(player, fieldRole(player)) - theirs,
        );
        const behind = leader - (pointsOf.get(side.id) ?? 0);
        return [{ player, from: side, gap, behind }];
      }),
    )
    .sort(
      (left, right) =>
        right.behind - left.behind ||
        left.gap - right.gap ||
        right.player.skills.stamina - left.player.skills.stamina,
    );
}

/** A lent player whose borrowed side won the game they were lent for. */
export type LoanHero = {
  playerId: string;
  /** The side they were lent to, and helped win. */
  teamId: string;
  goals: number;
};

/**
 * The lent players who helped their borrowed side win.
 *
 * The other half of keeping a loan honest: the pot rewards your own side, so
 * this is the reward for playing properly for somebody else's. It is shown on
 * the night's results, by name, with the goals they scored for them.
 */
export function loanHeroes(
  loans: MatchLoan[],
  games: MatchGame[],
  goals: MatchGoal[],
): LoanHero[] {
  return loans.flatMap((loan) => {
    const game = games.find((one) => one.slot === loan.slot);
    if (!game || game.endedAt === null) return [];

    const score = gameScore(goals, game);
    const won =
      (game.homeTeamId === loan.teamId && score.home > score.away) ||
      (game.awayTeamId === loan.teamId && score.away > score.home);
    if (!won) return [];

    return [
      {
        playerId: loan.playerId,
        teamId: loan.teamId,
        goals: goals.filter(
          (goal) => goal.gameId === game.id && goal.playerId === loan.playerId,
        ).length,
      },
    ];
  });
}

/** A keeper lent out plays outfield: their own side's gloves stay at home. */
function fieldRole(player: Player) {
  return player.position === "gk" ? "def" : player.position;
}
