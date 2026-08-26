"use client";

import {
  Location01Icon,
  Time04Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";
import { formatLongDate, formatTime, relativeLabel } from "@/lib/date";
import type { Match } from "@/types";

/**
 * Match details. Chrome-less on purpose: it lives inside the shared HUD card,
 * to the right of the logo.
 */
export function MatchHudCard({ match }: { match: Match | null }) {
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

  return (
    <div className="min-w-0">
      <p
        className="mt-1 truncate font-display flex gap-1 text-lg uppercase leading-tight tracking-[0.04em] sm:text-xl"
        suppressHydrationWarning
      >
        {formatLongDate(match.playedAt)}

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span suppressHydrationWarning>
              {relativeLabel(match.playedAt)}
            </span>
          </span>
        </div>
      </p>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5" suppressHydrationWarning>
          <Icon icon={Time04Icon} size={13} />
          {formatTime(match.playedAt)}
        </span>

        {match.location ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon icon={Location01Icon} size={13} />
            <span className="truncate">{match.location}</span>
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
