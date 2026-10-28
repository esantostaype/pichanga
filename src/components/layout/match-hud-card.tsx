"use client";

import {
  Location01Icon,
  RepeatIcon,
  Time04Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { LiveBadge } from "@/components/matches/live-badge";
import { AppLink } from "@/components/ui/app-link";
import { Icon } from "@/components/ui/icon";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import {
  formatLongDate,
  formatTimeRange,
  isLive,
  relativeLabel,
} from "@/lib/date";
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
  const { t, locale } = useLocale();
  const now = useNow();

  if (!match) {
    return (
      <div className="min-w-0">
        <p className="font-display text-base uppercase leading-tight tracking-[0.04em] sm:text-lg">
          {t.hud.noMatch}
        </p>
        <p className="text-xs text-muted-foreground">{t.hud.noMatchLine}</p>
      </div>
    );
  }

  const live = now !== null && isLive(match.playedAt, match.endsAt, now);

  /**
   * Played and finished. The pitch keeps the match for three days after the
   * whistle so the rental can be collected, so this state is on screen for
   * longer than the match itself.
   */
  // A night closed from the results is over whatever the clock says: the
  // sandbox can close one before its booked end.
  const over =
    match.closedAt !== null || (now !== null && now >= match.endsAt);

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
        {formatLongDate(match.playedAt, locale)}

        {live && match.closedAt === null ? (
          <LiveBadge />
        ) : over ? (
          /*
            Over: closed from the results, or simply past its time. What is
            owed lives in the night's accounts now, not up here.
          */
          <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
            {match.closedAt !== null ? t.hud.nightClosed : t.hud.finished}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span>
              {relativeLabel(match.playedAt, undefined, locale, t.common)}
            </span>
          </span>
        )}

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

        {match.venue ? (
          <span className="flex min-w-0 items-center gap-1.5">
            {/*
              The link covers the venue and stops there: the maps pin is the
              venue's, and the pitch is not somewhere Google can take you, so
              underlining it would promise a page that does not exist.
            */}
            {match.venue.mapsUrl ? (
              <AppLink
                href={match.venue.mapsUrl}
                external
                icon={Location01Icon}
                iconSize={13}
                className="gap-1.5"
                title={match.venue.address ?? match.venue.name}
              >
                {match.venue.name}
              </AppLink>
            ) : (
              <>
                <Icon icon={Location01Icon} size={13} />
                <span className="truncate">{match.venue.name}</span>
              </>
            )}

            {match.pitch ? (
              <span className="truncate text-muted-foreground">
                · {match.pitch}
              </span>
            ) : null}
          </span>
        ) : null}

        {match.recurrence === "weekly" ? (
          <span
            className="flex items-center gap-1.5"
            title={t.hud.repeatsWeekly}
          >
            <Icon icon={RepeatIcon} size={13} />
            {t.hud.weekly}
          </span>
        ) : null}

        <span className="flex items-center gap-1.5">
          <Icon icon={UserGroupIcon} size={13} />
          {match.players.length}{" "}
          {match.players.length === 1 ? t.common.player : t.common.players}
        </span>
      </div>
    </div>
  );
}
