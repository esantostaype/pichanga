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
import { formatLongDate, formatTimeRange, isLive, relativeLabel } from "@/lib/date";
import type { Match } from "@/types";

/**
 * Match details. Chrome-less on purpose: it lives inside the shared HUD card,
 * to the right of the logo.
 */
export function MatchHudCard({ match }: { match: Match | null }) {
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

  return (
    <div className="min-w-0">
      <p
        className="mt-1 flex items-center gap-2 truncate font-display text-lg uppercase leading-tight tracking-[0.04em] sm:text-xl"
        suppressHydrationWarning
      >
        {formatLongDate(match.playedAt)}

        {live ? (
          <LiveBadge />
        ) : (
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span suppressHydrationWarning>{relativeLabel(match.playedAt)}</span>
          </span>
        )}
      </p>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5" suppressHydrationWarning>
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
