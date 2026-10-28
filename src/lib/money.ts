/**
 * Currency the pitch rental is quoted in.
 *
 * The locale is pinned like the time zone is: `Intl` with the runtime's own
 * locale would format differently on the server than in the browser, and the
 * SSR markup would not match.
 */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "PEN";

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (amount: number) => money.format(amount);

/**
 * What each player owes for a match.
 *
 * `null` when there is nothing to split or nobody to split it between, so the
 * caller can leave the slot empty rather than print a zero or an infinity.
 */
export function perPlayer(price: number | null | undefined, players: number) {
  if (!price || price <= 0 || players <= 0) return null;
  return roundUp(price / players);
}

/**
 * A share rounded up to the ten céntimos: S/ 2.65 is S/ 2.70, S/ 2.91 is S/ 3.
 * Smaller coins are not changing hands at a pitch, and rounding up rather than
 * down means the pitch is always covered -- the few céntimos over stay with
 * whoever paid the venue.
 */
export const roundUp = (amount: number) =>
  Math.round(Math.ceil(amount * 10 - 1e-9)) / 10;

/**
 * Each player's share of the pitch: the rental split between whoever came.
 *
 * The no-shows' penalties play no part in it. That money is kept apart -- it
 * goes towards the pichangas' anniversary -- so it neither lowers the pitch
 * nor adds to the pot; it is only collected.
 */
export function rentalShare(match: {
  venue: { price: number | null } | null;
  players: unknown[];
}) {
  const price = match.venue?.price ?? 0;
  if (price <= 0 || match.players.length === 0) return null;

  return roundUp(price / match.players.length);
}

/**
 * Whether money may change hands yet.
 *
 * Not before the night is over: until then somebody can still sign up at the
 * last minute, which changes everybody's share of the pitch, and the pot is
 * not won yet. So the collecting -- the pitch, the penalties and the prize --
 * all happens together once the night is closed, or once its time is up for a
 * match that never had a night kept.
 */
export const canSettle = (
  match: { closedAt: number | null; endsAt: number },
  now: number,
) => match.closedAt !== null || match.endsAt <= now;

/**
 * Whether the ledger is closed: the match is over and nobody still owes.
 *
 * The same line the server draws in `settlingUp` to decide whether a finished
 * match keeps the front page, so the two never disagree about whether a date
 * is done with. Both counts already treat the organizer as settled -- they pay
 * the venue -- so `paid` reaching `players` really does mean everybody.
 *
 * A match nobody signed up for is settled the moment it ends: nothing was
 * owed, so there is nothing to collect.
 */
export const isSettled = (
  { endsAt, players, paid }: { endsAt: number; players: number; paid: number },
  now: number | null,
) => now !== null && endsAt <= now && paid >= players;
