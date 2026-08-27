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
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/hooks/use-action";
import { formatMoney, perPlayer } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The rental ledger for the match on the pitch: who has paid their share and
 * who still owes it.
 *
 * A guest reads it; only the session can change it. There is no per-person
 * login, so ticking your own name would be an honour system rather than a
 * record.
 */
export function PaymentsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { nextMatch, isAdmin, setPlayerPaid } = usePichanga();

  const toggle = useAction(
    async ({ playerId, paid }: { playerId: string; paid: boolean }) =>
      setPlayerPaid(playerId, paid),
  );

  const players = nextMatch?.players ?? [];
  const paid = new Set(nextMatch?.paidPlayerIds ?? []);
  const share = perPlayer(nextMatch?.place?.price, players.length);

  const collected = share === null ? null : share * paid.size;
  const pending = share === null ? null : share * (players.length - paid.size);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rental</DialogTitle>
          <DialogDescription>
            {share === null
              ? "This venue has no price yet, so there is nothing to split."
              : `${formatMoney(share)} each. ${paid.size} of ${players.length} settled.`}
          </DialogDescription>
        </DialogHeader>

        {collected !== null && pending !== null ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/25 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Collected
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
                Pending
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

        {players.length === 0 ? (
          <EmptyState
            icon={Coins01Icon}
            title="Nobody on the pitch"
            description="Add players to the match and their shares appear here."
          />
        ) : (
          <ul className="-mx-2 max-h-80 overflow-y-auto scrollbar-thin">
            {players.map((player) => {
              const hasPaid = paid.has(player.id);
              // The organizer pays the venue, so their share is settled by
              // definition and there is nothing to switch off.
              const isOrganizer = player.id === nextMatch?.organizerId;

              return (
                <li
                  key={player.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
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
                      className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400"
                      title="The organizer pays the venue, so their share is always settled"
                    >
                      <Icon icon={CrownIcon} size={14} />
                      Organizer
                    </span>
                  ) : isAdmin ? (
                    <Switch
                      className="ml-auto"
                      checked={hasPaid}
                      disabled={toggle.pending}
                      onCheckedChange={(next) =>
                        void toggle.run({ playerId: player.id, paid: next })
                      }
                      aria-label={`${player.firstName} paid the rental`}
                    />
                  ) : (
                    <span
                      className={cn(
                        "ml-auto flex items-center gap-1.5 text-xs",
                        hasPaid ? "text-emerald-400" : "text-muted-foreground",
                      )}
                    >
                      <Icon
                        icon={hasPaid ? PaymentSuccess01Icon : MoneyNotFound01Icon}
                        size={16}
                      />
                      {hasPaid ? "Paid" : "Pending"}
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
