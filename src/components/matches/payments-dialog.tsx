"use client";

import {
  Coins01Icon,
  CrownIcon,
  MoneyNotFound01Icon,
  PaymentSuccess01Icon,
} from "@hugeicons/core-free-icons";

import { AreaBadge } from "@/components/players/area-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { usePichanga } from "@/components/providers/pichanga-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/components/providers/locale-provider";
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { formatLongDate } from "@/lib/date";
import { formatMoney, perPlayer } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Match } from "@/types";

/**
 * The rental ledger for one match: who has paid their share and who still owes
 * it, with the lineup underneath.
 *
 * Takes the match rather than reading the one on screen, so the same dialog
 * serves the pitch and any date opened from the fixture list. `onToggled` is
 * for the caller that keeps its own copy: the match on screen is refreshed by
 * the provider, a date from the drawer is refetched by the drawer.
 *
 * A guest reads it; only the session can change it. There is no per-person
 * login, so ticking your own name would be an honour system rather than a
 * record.
 */
/**
 * The hairline between one name and the next: white at six per cent, the same
 * rule the team sheets are ruled with. Never under the last one -- a line
 * below the final row draws a floor the list does not have.
 */
const rule =
  "[&>li:not(:last-child)]:border-b [&>li:not(:last-child)]:border-white/[0.06]";

export function PaymentsDialog({
  open,
  onOpenChange,
  match,
  loading,
  onToggled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  loading?: boolean;
  onToggled?: () => void;
}) {
  const { t, locale } = useLocale();
  const { isAdmin, setPlayerPaid } = usePichanga();

  const toggle = useAction(
    async ({ playerId, paid }: { playerId: string; paid: boolean }) => {
      if (!match) return;
      await setPlayerPaid(playerId, paid, match.id);
      onToggled?.();
    },
  );

  const players = match?.players ?? [];
  const paid = new Set(match?.paidPlayerIds ?? []);
  const share = perPlayer(match?.place?.price, players.length);

  const collected = share === null ? null : share * paid.size;
  const pending = share === null ? null : share * (players.length - paid.size);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {/*
              The heading is the date of the match, so while that is on its way
              there is nothing truthful to put here. The word stays for anything
              reading the dialog out loud.
            */}
            <span className={cn(loading && "sr-only")}>
              {match ? formatLongDate(match.playedAt, locale) : t.ledger.title}
            </span>
            {loading ? (
              <span className="flex h-7 items-center">
                <Skeleton className="h-5 w-56" />
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription asChild={loading}>
            {loading ? (
              <span className="flex h-5 items-center">
                <Skeleton className="h-3.5 w-64" />
              </span>
            ) : share === null ? (
              t.ledger.noPrice
            ) : (
              fill(t.ledger.eachSettled, {
                money: formatMoney(share),
                paid: paid.size,
                total: players.length,
              })
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[t.ledger.collected, t.ledger.pending].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-border/60 bg-muted/25 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <span className="mt-0.5 flex h-7 items-center">
                  <Skeleton className="h-5 w-24" />
                </span>
              </div>
            ))}
          </div>
        ) : collected !== null && pending !== null ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/25 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t.ledger.collected}
              </p>
              <p className="mt-0.5 text-lg tabular-nums text-foreground">
                {formatMoney(collected)}
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border px-4 py-3",
                pending > 0
                  ? "border-amber-400/30 bg-amber-400/10"
                  : "border-border/60 bg-muted/25",
              )}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t.ledger.pending}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-lg tabular-nums",
                  pending > 0 ? "text-amber-300" : "text-foreground",
                )}
              >
                {formatMoney(pending)}
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <ul className={cn("-mx-2", rule)}>
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <span className="flex min-w-0 flex-col">
                  <span className="flex h-5 items-center">
                    <Skeleton className="h-3.5 w-32" />
                  </span>
                  <span className="flex h-[26px] items-center">
                    <Skeleton className="h-[22px] w-20 rounded-full" />
                  </span>
                </span>
                <Skeleton className="ml-auto h-4 w-20" />
              </li>
            ))}
          </ul>
        ) : players.length === 0 ? (
          <EmptyState
            icon={Coins01Icon}
            title={t.ledger.emptyTitle}
            description={t.ledger.emptyLine}
          />
        ) : (
          <ul
            className={cn(
              "-mx-2 max-h-80 overflow-y-auto scrollbar-thin",
              rule,
            )}
          >
            {players.map((player) => {
              const hasPaid = paid.has(player.id);
              // The organizer pays the venue, so their share is settled by
              // definition and there is nothing to switch off.
              const isOrganizer = player.id === match?.organizerId;

              return (
                <li
                  key={player.id}
                  className="flex items-center gap-3 px-2 py-2.5"
                >
                  <PlayerAvatar player={player} className="size-9 shrink-0" />

                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {player.firstName} {player.lastName}
                    </span>
                    <AreaBadge area={player.area} />
                  </span>

                  {isOrganizer ? (
                    <span
                      className="ml-auto flex items-center gap-1.5 text-xs text-primary"
                      title={t.ledger.organizerNote}
                    >
                      <Icon icon={CrownIcon} size={14} />
                      {t.ledger.organizer}
                    </span>
                  ) : isAdmin ? (
                    <Switch
                      className="ml-auto"
                      checked={hasPaid}
                      disabled={toggle.pending}
                      onCheckedChange={(next) =>
                        void toggle.run({ playerId: player.id, paid: next })
                      }
                      aria-label={fill(t.ledger.paidToggle, {
                        name: player.firstName,
                      })}
                    />
                  ) : (
                    <span
                      className={cn(
                        "ml-auto flex items-center gap-1.5 text-xs",
                        hasPaid ? "text-emerald-400" : "text-muted-foreground",
                      )}
                    >
                      <Icon
                        icon={
                          hasPaid ? PaymentSuccess01Icon : MoneyNotFound01Icon
                        }
                        size={16}
                      />
                      {hasPaid ? t.ledger.paid : t.ledger.pending}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
