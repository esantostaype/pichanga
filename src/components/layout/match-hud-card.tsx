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
import { fill } from "@/i18n/dictionaries";
import { formatMoney, perPlayer } from "@/lib/money";
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
  onOpenPayments,
}: {
  match: Match | null;
  /** One item per line, for the centred dialog on a phone. */
  stacked?: boolean;
  /** Opens the rental ledger. The money pill becomes the button for it. */
  onOpenPayments?: () => void;
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
        {formatLongDate(match.playedAt, locale)}

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
            {owing > 0 ? fill(t.hud.toPay, { count: owing }) : t.hud.allPaid}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span>
              {relativeLabel(match.playedAt, undefined, locale, t.common)}
            </span>
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
            title={fill(t.hud.splitTitle, {
              money: formatMoney(match.place!.price!),
              count: match.players.length,
              players:
                match.players.length === 1 ? t.common.player : t.common.players,
            })}
          >
            <span className="text-sm tabular-nums text-foreground">
              {formatMoney(share)}
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
              {t.common.each}
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
          match.place.mapsUrl ? (
            <AppLink
              href={match.place.mapsUrl}
              external
              icon={Location01Icon}
              iconSize={13}
              className="gap-1.5"
              title={match.place.address ?? match.place.name}
            >
              {match.place.name}
            </AppLink>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <Icon icon={Location01Icon} size={13} />
              <span className="truncate">{match.place.name}</span>
            </span>
          )
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
