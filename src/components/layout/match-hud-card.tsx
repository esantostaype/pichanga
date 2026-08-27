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
}: {
  match: Match | null;
  /** One item per line, for the centred dialog on a phone. */
  stacked?: boolean;
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
          <span
            className={cn(
              "flex shrink-0 items-baseline gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5",
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
          </span>
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
