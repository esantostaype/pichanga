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
  return price / players;
}

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
