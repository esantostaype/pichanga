"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useLayoutEffect, useRef, useState } from "react";

import { PlayerAvatar } from "@/components/players/player-avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLocale } from "@/components/providers/locale-provider";
import { fill } from "@/i18n/dictionaries";
import { EASE } from "@/lib/ease";
import { formatMoney, rentalShare } from "@/lib/money";
import { playerLedger, type NightPrize } from "@/lib/prize";
import { cn } from "@/lib/utils";
import type { Match } from "@/types";

gsap.registerPlugin(Flip);

/**
 * Everybody's money for the night: what each one is handed or owes right now,
 * and where the night leaves them all told.
 *
 * The thing to have open while the cash changes hands. A winner who has not
 * paid the pitch is handed their prize with the rental already taken off; a
 * loser who has not paid it is the one to collect from. The stake is already
 * in the pot, so it only shows in the night's net.
 */
export function PrizeLedger({
  match,
  prize,
  onTogglePaid,
  onUndoNoShow,
  className,
}: {
  match: Match;
  prize: NightPrize;
  /** Ticks somebody off once the money has changed hands. Absent: read only. */
  onTogglePaid?: (playerId: string, paid: boolean) => Promise<unknown>;
  /** They came after all. */
  onUndoNoShow?: (playerId: string) => void;
  className?: string;
}) {
  const { t } = useLocale();
  /** Whose mark is on its way to the server: that button waits, the rest do not. */
  const [saving, setSaving] = useState<Set<string>>(() => new Set());

  /*
   * The order the rows are shown in, held still while a mark is saving.
   *
   * Ticking somebody off moves them down the list -- settled rows sink -- and
   * a row that jumps away the moment it is pressed is a row nobody can check.
   * So the order is frozen until the server has answered, and then the rows
   * slide to their new places rather than snapping there.
   */
  const [frozen, setFrozen] = useState<string[] | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);

  const toggle = async (playerId: string, paid: boolean) => {
    if (!onTogglePaid || saving.has(playerId)) return;
    setFrozen((prev) => prev ?? shownIds);
    setSaving((prev) => new Set(prev).add(playerId));

    try {
      await onTogglePaid(playerId, paid);
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        // The last one in: remember where everybody is, then let them move.
        if (next.size === 0) {
          if (list.current) {
            flip.current = Flip.getState(list.current.children);
          }
          setFrozen(null);
        }
        return next;
      });
    }
  };

  // The release: every row slides from where it was to where it now belongs.
  useLayoutEffect(() => {
    if (!flip.current || frozen) return;
    Flip.from(flip.current, { duration: 0.6, ease: EASE });
    flip.current = null;
  });

  const rental = rentalShare(match) ?? 0;
  const ledger = playerLedger(prize, {
    rental,
    paidPlayerIds: match.paidPlayerIds,
    noShowIds: match.noShows.map((player) => player.id),
  });

  const byId = new Map(
    [...match.players, ...match.noShows].map((player) => [player.id, player]),
  );

  const rowById = new Map(ledger.map((row) => [row.playerId, row]));
  const sortedIds = ledger.map((row) => row.playerId);
  const shownIds = frozen
    ? [
        ...frozen.filter((id) => rowById.has(id)),
        // Anybody new while frozen goes at the foot until the list settles.
        ...sortedIds.filter((id) => !frozen.includes(id)),
      ]
    : sortedIds;
  const teamById = new Map(match.teams.map((team) => [team.id, team]));

  const toHand = ledger.reduce((sum, row) => sum + Math.max(0, row.settle), 0);
  const toCollect = ledger.reduce((sum, row) => sum + Math.max(0, -row.settle), 0);

  return (
    <section
      className={cn(
        "w-full rounded-2xl border border-border/70 bg-card/85 p-4 backdrop-blur-md",
        className,
      )}
    >
      <header className="mb-3 flex flex-col gap-1">
        <h2 className="font-display text-2xl uppercase tracking-[0.04em]">
          {t.results.ledgerTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {fill(t.results.ledgerLine, {
            bet: formatMoney(prize.bet),
            rental: formatMoney(rental),
          })}
          {match.noShows.length && prize.bet > 0
            ? ` ${fill(t.results.noShowLine, {
                count: match.noShows.length,
                amount: formatMoney(prize.bet * match.noShows.length),
              })}`
            : ""}
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-0.5 font-display text-lg uppercase tracking-[0.04em]">
          <span className="text-primary">
            {fill(t.results.toHandTotal, { amount: formatMoney(toHand) })}
          </span>
          <span className="text-amber-400">
            {fill(t.results.toCollectTotal, { amount: formatMoney(toCollect) })}
          </span>
        </p>
      </header>

      <ul
        ref={list}
        className="flex flex-col [&>li:not(:last-child)]:border-b [&>li:not(:last-child)]:border-white/[0.06]"
      >
        {shownIds.map((id) => {
          const row = rowById.get(id)!;
          const player = byId.get(row.playerId);
          const team = teamById.get(row.teamId);
          if (!player) return null;
          const ring = team?.accent ?? "#71717a";
          const isOrganizer = player.id === match.organizerId;
          /*
           * Which way the money goes, read before anything was ticked: once a
           * row is settled its balance is zero and could be either. Money in
           * from them is "collected", money out to them is "settled".
           */
          const collecting =
            (row.noShow ? -row.penalty : row.prize - row.rental - row.bet) <= 0;

          return (
            <li key={row.playerId} className="flex items-center gap-3 py-3">
              <PlayerAvatar
                player={player}
                className="size-11 shrink-0"
                style={{ outline: `2px solid ${ring}`, outlineOffset: "-2px" }}
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium">
                  {player.firstName} {player.lastName}
                </span>
                <span className="block text-sm leading-snug text-muted-foreground">
                  {row.noShow ? (
                    <>
                      {fill(t.results.noShowRow, {
                        amount: formatMoney(row.penalty),
                      })}
                      {onUndoNoShow ? (
                        <>
                          {" · "}
                          <button
                            type="button"
                            onClick={() => onUndoNoShow(row.playerId)}
                            className="cursor-pointer underline underline-offset-2 hover:text-foreground"
                          >
                            {t.results.cameAfterAll}
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : (
                    /*
                     * The total on the right, and here what makes it up: the
                     * prize if they won, less the pitch and the bet that are
                     * collected from everybody at the end of the night.
                     */
                    <>
                      {row.prize > 0
                        ? `${fill(t.results.prizeOf, { amount: formatMoney(row.prize) })} − `
                        : ""}
                      {fill(t.results.pitchOf, { amount: formatMoney(rental) })}
                      {prize.bet > 0
                        ? ` + ${fill(t.results.betOf, { amount: formatMoney(prize.bet) })}`
                        : ""}
                    </>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end">
                {row.settle > 0.004 ? (
                  <>
                    <span className="text-xs uppercase tracking-wider text-primary/60">
                      {t.results.hand}
                    </span>
                    <span className="font-display text-2xl leading-tight tabular-nums text-primary">
                      {formatMoney(row.settle)}
                    </span>
                  </>
                ) : row.settle < -0.004 ? (
                  <>
                    <span className="text-xs uppercase tracking-wider text-amber-400/60">
                      {t.results.collectFrom}
                    </span>
                    <span className="font-display text-2xl leading-tight tabular-nums text-amber-400">
                      {formatMoney(-row.settle)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t.results.settled}
                  </span>
                )}

                {/*
                  Ticked once the money has changed hands, either way. The
                  organizer is square by definition -- they pay the venue.
                */}
                {onTogglePaid && !isOrganizer && (row.settle !== 0 || row.paid) ? (
                  row.paid && !saving.has(row.playerId) ? (
                    /*
                     * Done: what happened, in the success colour, and a quiet
                     * way back for the mis-tap.
                     */
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-400">
                        {collecting ? t.results.collected : t.results.handed}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void toggle(row.playerId, false)}
                        className="border border-border/60"
                      >
                        {t.results.undo}
                      </Button>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={saving.has(row.playerId)}
                      onClick={() => void toggle(row.playerId, true)}
                      className="mt-1.5"
                    >
                      {saving.has(row.playerId) ? <Spinner /> : null}
                      {saving.has(row.playerId)
                        ? row.paid
                          ? collecting
                            ? t.results.collecting
                            : t.results.handing
                          : t.results.unsettling
                        : collecting
                          ? t.results.markCollected
                          : t.results.markHanded}
                    </Button>
                  )
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
