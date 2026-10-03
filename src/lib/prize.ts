import { standings, type Standing } from "./live";
import type { MatchGame, MatchGoal, MatchTeam } from "@/types";

export type PrizeRow = {
  team: MatchTeam;
  standing: Standing;
  /** 1 for the top of the table; sides level on points share a place. */
  place: number;
  /** What the side takes home, all of its players together. */
  prize: number;
  /** What each of its players takes home. */
  perPlayer: number;
};

export type NightPrize = {
  /** Everybody's stake, together. */
  pot: number;
  /** What each player put in. */
  bet: number;
  /** Who shares the pot. Empty when nothing was played, or everybody is level. */
  winnerIds: string[];
  /** Every side finished level on points: nobody wins, everybody keeps their stake. */
  allLevel: boolean;
  /** What each winning player takes. */
  perWinner: number;
  rows: PrizeRow[];
};

/**
 * The night's pot, and who takes it.
 *
 * Everybody who was drawn into a side puts in `bet`. The side on top of the
 * table takes the lot, and its players split it evenly. **Level on points is
 * level**: two or three sides tied at the top share the pot, split evenly
 * between every one of their players -- goal difference orders the table on
 * screen, but it does not decide money.
 *
 * Nothing played, nothing won: with no finished game there is no winner, and
 * every row says zero. The same when **every** side ends level -- two of two,
 * three of three, four of four: a pot shared by everybody is everybody getting
 * their own stake back, so there is no winner and no cup.
 */
export function nightPrize(
  teams: MatchTeam[],
  games: MatchGame[],
  goals: MatchGoal[],
  bet: number,
): NightPrize {
  const table = standings(teams, games, goals);
  const byId = new Map(teams.map((team) => [team.id, team]));

  const players = teams.reduce((total, team) => total + team.playerIds.length, 0);
  const pot = Math.max(0, bet) * players;

  const anyPlayed = table.some((row) => row.played > 0);
  const top = anyPlayed ? Math.max(...table.map((row) => row.points)) : null;

  const level =
    top === null
      ? []
      : table.filter((row) => row.points === top).map((row) => row.teamId);

  const allLevel = teams.length > 1 && level.length === teams.length;
  const winnerIds = allLevel ? [] : level;

  const winningPlayers = winnerIds.reduce(
    (total, id) => total + (byId.get(id)?.playerIds.length ?? 0),
    0,
  );

  const perWinner = winningPlayers > 0 ? pot / winningPlayers : 0;

  const rows = table.flatMap((standing) => {
    const team = byId.get(standing.teamId);
    if (!team) return [];

    const won = winnerIds.includes(team.id);

    return [
      {
        team,
        standing,
        // Places by points alone, so the sides sharing the pot share a step.
        place: 1 + table.filter((row) => row.points > standing.points).length,
        prize: won ? perWinner * team.playerIds.length : 0,
        perPlayer: won ? perWinner : 0,
      },
    ];
  });

  return { pot, bet, winnerIds, allLevel, perWinner, rows };
}

export type LedgerRow = {
  playerId: string;
  teamId: string;
  /** What they put in for the bet. Already in the pot. */
  bet: number;
  /** Their share of the pot: zero unless their side won it. */
  prize: number;
  /** Their share of the pitch rental. */
  rental: number;
  /** Whether that share is in already. The organizer always counts as paid. */
  paid: boolean;
  /** Signed up and never came: no prize, no rental, the bet as a penalty. */
  noShow: boolean;
  /** What a no-show owes; zero for everybody who played. */
  penalty: number;
  /**
   * What changes hands now: positive is handed to them, negative is collected
   * from them. The pitch and the bet are both collected at the end of the
   * night, and for a winner they come off the prize, so a winner is simply
   * handed less -- or asked for the difference when the prize is smaller.
   */
  settle: number;
  /** Where the night leaves them, all told: prize less stake less rental. */
  net: number;
};

/**
 * Everybody's money for the night, in one row each.
 *
 * Nothing changes hands before the night is over, so the stake is collected
 * at the end along with the pitch: each player owes both, the winners have
 * them taken off their prize, and whoever is ticked off owes nothing more.
 */
export function playerLedger(
  prize: NightPrize,
  {
    rental,
    paidPlayerIds,
    noShowIds = [],
  }: {
    /**
     * Each player's share of the pitch, with the penalties already taken off
     * it (`rentalShare`), or zero when nobody priced it.
     */
    rental: number;
    paidPlayerIds: string[];
    /** Signed up and never came: they owe the bet, and nothing else. */
    noShowIds?: string[];
  },
): LedgerRow[] {
  const paid = new Set(paidPlayerIds);

  const absent = noShowIds.map((playerId) => {
    const isPaid = paid.has(playerId);
    return {
      playerId,
      teamId: "",
      bet: 0,
      prize: 0,
      rental: 0,
      paid: isPaid,
      noShow: true,
      penalty: prize.bet,
      settle: isPaid ? 0 : -prize.bet,
      net: -prize.bet,
    };
  });

  const present = prize.rows
    .flatMap((row) =>
      row.team.playerIds.map((playerId) => {
        const won = row.perPlayer;
        const isPaid = paid.has(playerId);

        return {
          playerId,
          teamId: row.team.id,
          bet: prize.bet,
          prize: won,
          rental,
          paid: isPaid,
          noShow: false,
          penalty: 0,
          settle: won - (isPaid ? 0 : rental + prize.bet),
          net: won - prize.bet - rental,
        };
      }),
    )
    .sort(
      (left, right) =>
        right.prize - left.prize || left.settle - right.settle,
    );

  // Winners first, then everybody who played, then the ones who did not come.
  return [...present, ...absent];
}
