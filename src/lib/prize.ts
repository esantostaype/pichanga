import { gameScore, standings, type Standing } from "./live";
import { rentalShare } from "./money";
import type {
  BetMode,
  Match,
  MatchGame,
  MatchGoal,
  MatchLive,
  MatchTeam,
} from "@/types";

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

  /*
   * Down to the ten céntimos: S/ 10.38 is handed over as S/ 10.30. Coins
   * smaller than that are not changing hands at a pitch, and rounding down
   * means the pot always covers it -- the few céntimos over stay with whoever
   * holds the money.
   */
  const perWinner = winningPlayers > 0 ? downToTen(pot / winningPlayers) : 0;

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

/** Hacia abajo, a los diez céntimos: lo que de verdad cambia de manos. */
function downToTen(amount: number) {
  return Math.floor(amount * 10 + 1e-9) / 10;
}

/* -------------------------------------------------------------------------- */
/*                            apuesta por partido                             */
/* -------------------------------------------------------------------------- */

export type GameBetRow = {
  team: MatchTeam;
  standing: Standing;
  /** Lo que el equipo cobró por los partidos que ganó, entre todos. */
  won: number;
  /** Lo que pagó por los que perdió, entre todos. */
  lost: number;
  /** Cobrado menos pagado: positivo es que la noche le dejó plata. */
  net: number;
  /** Lo que cobra cada uno de sus jugadores. */
  wonEach: number;
  /** Lo que paga cada uno: la apuesta por cada partido perdido. */
  lostEach: number;
};

/** Lo que un equipo le debe a otro, ya descontado lo que el otro le debe a él. */
export type TeamDebt = {
  from: MatchTeam;
  to: MatchTeam;
  amount: number;
  /** Partidos que `to` le ganó a `from`, y al revés: de dónde sale la cuenta. */
  toWon: number;
  fromWon: number;
};

export type GameBets = {
  /** Lo que pone cada jugador por partido. */
  bet: number;
  /** Un equipo por fila, en el orden de la tabla. */
  rows: GameBetRow[];
  /** Quién le debe a quién, la deuda más grande primero. */
  debts: TeamDebt[];
};

/**
 * La apuesta por partido: cada partido perdido se le paga al que lo ganó.
 *
 * Es por jugador: cada jugador del equipo que pierde pone `bet`, y el total se
 * reparte entre los jugadores del que gana. Con siete contra siete y S/ 5, el
 * partido mueve S/ 35. Si los equipos no tienen la misma cantidad de
 * jugadores, cada perdedor igual paga `bet`, y el ganador reparte lo que
 * reciba. Cuenta la alineación de cada equipo; los préstamos de un partido no
 * cambian quién paga.
 *
 * Los empates no se pagan, y los partidos sin terminar no cuentan.
 *
 * No hace falta que todos jueguen la misma cantidad de partidos: cada uno se
 * cobra por separado, así que el que jugó menos simplemente tuvo menos
 * oportunidades de ganar o de perder.
 *
 * Al final, lo de cada par de equipos se compensa: si A le ganó dos a B y B le
 * ganó uno a A, A cobra la diferencia y no se pasan la plata dos veces.
 */
export function gameBets(
  teams: MatchTeam[],
  games: MatchGame[],
  goals: MatchGoal[],
  bet: number,
): GameBets {
  const stake = Math.max(0, bet);
  const table = standings(teams, games, goals);
  const byId = new Map(teams.map((team) => [team.id, team]));

  /** Por par `perdedor>ganador`: cuánto pagó y cuántos partidos perdió. */
  const paid = new Map<string, number>();
  const losses = new Map<string, number>();
  const won = new Map<string, number>();
  const lost = new Map<string, number>();
  const wonEach = new Map<string, number>();
  const lostEach = new Map<string, number>();
  const add = (map: Map<string, number>, key: string, amount: number) =>
    map.set(key, (map.get(key) ?? 0) + amount);

  for (const game of games) {
    if (game.endedAt === null) continue;

    const score = gameScore(goals, game);
    if (score.home === score.away) continue;

    const [winnerId, loserId] =
      score.home > score.away
        ? [game.homeTeamId, game.awayTeamId]
        : [game.awayTeamId, game.homeTeamId];
    const winner = byId.get(winnerId);
    const loser = byId.get(loserId);
    if (!winner || !loser) continue;

    const amount = stake * loser.playerIds.length;
    const pair = `${loser.id}>${winner.id}`;

    add(paid, pair, amount);
    add(losses, pair, 1);
    add(won, winner.id, amount);
    add(lost, loser.id, amount);
    add(lostEach, loser.id, stake);
    if (winner.playerIds.length > 0) {
      add(wonEach, winner.id, amount / winner.playerIds.length);
    }
  }

  const debts: TeamDebt[] = [];
  teams.forEach((one, index) => {
    for (const other of teams.slice(index + 1)) {
      const owed =
        (paid.get(`${one.id}>${other.id}`) ?? 0) -
        (paid.get(`${other.id}>${one.id}`) ?? 0);
      if (Math.abs(owed) < 0.005) continue;

      const [from, to] = owed > 0 ? [one, other] : [other, one];
      debts.push({
        from,
        to,
        amount: Math.abs(owed),
        toWon: losses.get(`${from.id}>${to.id}`) ?? 0,
        fromWon: losses.get(`${to.id}>${from.id}`) ?? 0,
      });
    }
  });
  debts.sort((left, right) => right.amount - left.amount);

  const rows = table.flatMap((standing) => {
    const team = byId.get(standing.teamId);
    if (!team) return [];

    const teamWon = won.get(team.id) ?? 0;
    const teamLost = lost.get(team.id) ?? 0;

    return [
      {
        team,
        standing,
        won: teamWon,
        lost: teamLost,
        net: teamWon - teamLost,
        // Como en el pozo: los céntimos que sobran se quedan con quien junta.
        wonEach: downToTen(wonEach.get(team.id) ?? 0),
        lostEach: lostEach.get(team.id) ?? 0,
      },
    ];
  });

  return { bet: stake, rows, debts };
}

/* -------------------------------------------------------------------------- */
/*                               las dos formas                               */
/* -------------------------------------------------------------------------- */

/** La plata de la noche, según cómo se haya apostado. */
export type NightMoney =
  | { mode: "pot"; bet: number; prize: NightPrize }
  | { mode: "perGame"; bet: number; games: GameBets };

export function nightMoney(
  match: Pick<Match, "teams" | "bet"> & { betMode: BetMode },
  live: Pick<MatchLive, "games" | "goals">,
): NightMoney {
  if (match.betMode === "perGame") {
    const games = gameBets(match.teams, live.games, live.goals, match.bet);
    return { mode: "perGame", bet: games.bet, games };
  }

  const prize = nightPrize(match.teams, live.games, live.goals, match.bet);
  return { mode: "pot", bet: prize.bet, prize };
}

export type LedgerRow = {
  playerId: string;
  teamId: string;
  /**
   * What they put in for the bet: the stake for the pot, or, betting per
   * game, what the games they lost cost them.
   */
  bet: number;
  /**
   * Their share of the pot (zero unless their side won it), or, betting per
   * game, what the games they won brought in.
   */
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
   * What changes hands at the end of the night: positive is handed to them,
   * negative is collected from them. The pitch and the bet are both collected
   * then, and for a winner they come off the prize, so a winner is simply
   * handed less -- or asked for the difference when the prize is smaller.
   *
   * The same before and after it is ticked off: `paid` says the money has
   * changed hands, not that the amount has changed.
   */
  settle: number;
  /** Where the night leaves them, all told: prize less stake less rental. */
  net: number;
};

type LedgerOptions = {
  /**
   * Each player's share of the pitch (`rentalShare`), or zero when nobody
   * priced it. Penalties play no part in it: they go to the anniversary.
   */
  rental: number;
  paidPlayerIds: string[];
  /** Signed up and never came: they owe the bet, and nothing else. */
  noShowIds?: string[];
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
  options: LedgerOptions,
): LedgerRow[] {
  return ledgerOf(
    prize.rows.map((row) => ({
      team: row.team,
      prize: row.perPlayer,
      stake: prize.bet,
    })),
    prize.bet,
    options,
  );
}

/**
 * Lo mismo con la apuesta por partido: cada jugador cobra lo que ganó su
 * equipo y paga lo que perdió, además de la cancha. El que no vino paga una
 * apuesta de multa, igual que con el pozo.
 */
export function gameLedger(bets: GameBets, options: LedgerOptions) {
  return ledgerOf(
    bets.rows.map((row) => ({
      team: row.team,
      prize: row.wonEach,
      stake: row.lostEach,
    })),
    bets.bet,
    options,
  );
}

/** El libro de cuentas de la noche, sea cual sea la forma de apostar. */
export function ledgerFor(money: NightMoney, options: LedgerOptions) {
  return money.mode === "pot"
    ? playerLedger(money.prize, options)
    : gameLedger(money.games, options);
}

/**
 * Las filas, a partir de lo que cada equipo cobra (`prize`) y paga (`stake`)
 * por jugador. `penalty` es lo que debe el que se anotó y no vino.
 */
function ledgerOf(
  sides: Array<{ team: MatchTeam; prize: number; stake: number }>,
  penalty: number,
  { rental, paidPlayerIds, noShowIds = [] }: LedgerOptions,
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
      penalty,
      settle: -penalty,
      net: -penalty,
    };
  });

  const present = sides
    .flatMap((side) =>
      side.team.playerIds.map((playerId) => {
        const won = side.prize;
        const isPaid = paid.has(playerId);

        return {
          playerId,
          teamId: side.team.id,
          bet: side.stake,
          prize: won,
          rental,
          paid: isPaid,
          noShow: false,
          penalty: 0,
          settle: won - rental - side.stake,
          net: won - side.stake - rental,
        };
      }),
    )
    .sort(
      (left, right) =>
        // Winners first; within each, whoever is still to settle above whoever
        // is done, so the list is a to-do that empties from the top.
        right.prize - right.bet - (left.prize - left.bet) ||
        Number(left.paid) - Number(right.paid) ||
        left.settle - right.settle,
    );

  // Winners first, then everybody who played, then the ones who did not come.
  return [
    ...present,
    ...absent.sort((left, right) => Number(left.paid) - Number(right.paid)),
  ];
}

/**
 * The whole night's money in one go: the pot and who won it, each player's
 * share of the pitch, everybody's row, and the two totals. What the accounts
 * dialog shows and what the shared accounts card draws, so the two never
 * disagree about a céntimo.
 */
export function nightAccounts(
  match: Match,
  live: Pick<MatchLive, "games" | "goals">,
) {
  const money = nightMoney(match, live);
  // La tabla y quién la ganó, también con la apuesta por partido: la copa es
  // para el primero aunque la plata se reparta partido a partido.
  const prize =
    money.mode === "pot"
      ? money.prize
      : nightPrize(match.teams, live.games, live.goals, match.bet);
  const rental = rentalShare(match) ?? 0;
  const ledger = ledgerFor(money, {
    rental,
    paidPlayerIds: match.paidPlayerIds,
    noShowIds: match.noShows.map((player) => player.id),
  });

  return {
    money,
    prize,
    rental,
    ledger,
    // Still to do: whoever is ticked off is done with.
    toHand: ledger.reduce(
      (sum, row) => sum + (row.paid ? 0 : Math.max(0, row.settle)),
      0,
    ),
    toCollect: ledger.reduce(
      (sum, row) => sum + (row.paid ? 0 : Math.max(0, -row.settle)),
      0,
    ),
  };
}
