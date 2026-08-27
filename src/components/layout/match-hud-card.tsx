"use client";

import {
  Location01Icon,
  RepeatIcon,
  Time04Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { LiveBadge } from "@/components/matches/live-badge";
import { Icon } from "@/components/ui/icon";
import { useNow } from "@/hooks/use-now";
import { formatMoney, perPlayer } from "@/lib/money";
import { cn } from "@/lib/utils";
import { formatLongDate, formatTimeRange, isLive, relativeLabel } from "@/lib/date";
import type { Match } from "@/types";

/**
 * Match details. Chrome-less on purpose: it lives inside the shared HUD card,
 * to the right of the logo.
 */
export function MatchHudCard({
  match,
  stacked,
  onOpenPayments,
}: {
  match: Match | null;
  /** One item per line, for the centred dialog on a phone. */
  stacked?: boolean;
  /** Opens the rental ledger. The money pill becomes the button for it. */
  onOpenPayments?: () => void;
}) {
  const now = useNow();

  if (!match) {
    return (
      <div className="min-w-0">
        <p className="font-display text-base uppercase leading-tight tracking-[0.04em] sm:text-lg">
          No match
        </p>
        <p className="text-xs text-muted-foreground">
          Create a date from the menu
        </p>
      </div>
    );
  }

  const live = now !== null && isLive(match.playedAt, match.endsAt, now);
  const share = perPlayer(match.place?.price, match.players.length);

  /**
   * Played and finished. The pitch keeps the match for three days after the
   * whistle so the rental can be collected, so this state is on screen for
   * longer than the match itself.
   */
  const over = now !== null && now >= match.endsAt;
  const owing = match.players.length - match.paidPlayerIds.length;

  return (
    <div className="min-w-0">
      <p
        className={cn(
          "mt-1 flex gap-2 font-display uppercase leading-tight tracking-[0.04em]",
          stacked
            ? "flex-col items-start text-xl"
            : "items-center truncate text-lg sm:text-xl",
        )}
      >
        {formatLongDate(match.playedAt)}

        {live ? (
          <LiveBadge />
        ) : over ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em]",
              owing > 0
                ? "bg-amber-400/15 text-amber-300"
                : "bg-emerald-400/15 text-emerald-300",
            )}
          >
            {owing > 0 ? `${owing} to pay` : "All paid"}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span>{relativeLabel(match.playedAt)}</span>
          </span>
        )}

        {/*
          The split sits at the far right of the date line. It recomputes on
          every render, so signing someone up updates it with the lineup.
        */}
        {share !== null ? (
          <button
            type="button"
            onClick={onOpenPayments}
            disabled={!onOpenPayments}
            className={cn(
              "flex shrink-0 cursor-pointer items-baseline gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 transition-colors",
              onOpenPayments
                ? "hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                : "cursor-default",
              stacked ? "" : "ml-auto",
            )}
            title={`${formatMoney(match.place!.price!)} split across ${match.players.length} ${match.players.length === 1 ? "player" : "players"}`}
          >
            <span className="text-sm tabular-nums text-foreground">
              {formatMoney(share)}
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
              each
            </span>
            <span className="text-[0.6rem] tabular-nums text-muted-foreground">
              {match.paidPlayerIds.length}/{match.players.length}
            </span>
          </button>
        ) : null}
      </p>

      <div
        className={cn(
          "text-sm text-muted-foreground",
          stacked
            ? "mt-3 flex flex-col items-start gap-2"
            : "mt-0.5 flex flex-wrap items-center gap-x-3.5 gap-y-1",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Icon icon={Time04Icon} size={13} />
          {formatTimeRange(match.playedAt, match.endsAt)}
        </span>

        {match.place ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon icon={Location01Icon} size={13} />
            {match.place.mapsUrl ? (
              <a
                href={match.place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate underline-offset-4 hover:text-primary hover:underline"
                title={match.place.address ?? match.place.name}
              >
                {match.place.name}
              </a>
            ) : (
              <span className="truncate">{match.place.name}</span>
            )}
          </span>
        ) : null}

        {match.recurrence === "weekly" ? (
          <span className="flex items-center gap-1.5" title="Repeats weekly">
            <Icon icon={RepeatIcon} size={13} />
            Weekly
          </span>
        ) : null}

        <span className="flex items-center gap-1.5">
          <Icon icon={UserGroupIcon} size={13} />
          {match.players.length}{" "}
          {match.players.length === 1 ? "player" : "players"}
        </span>
      </div>
    </div>
  );
}
