"use client";

import {
  Album02Icon,
  Delete02Icon,
  Location01Icon,
  PencilEdit02Icon,
  RepeatIcon,
  UserGroupIcon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";
import { AppLink } from "@/components/ui/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import {
  formatShortDate,
  formatTimeRange,
  isLive,
  relativeLabel,
} from "@/lib/date";
import { fill } from "@/i18n/dictionaries";
import { formatMoney, perPlayer } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "@/types";
import { LiveBadge } from "./live-badge";

/**
 * One fixture, as a card.
 *
 * A table put the date, the venue, a count and four buttons on one line, which
 * inside a drawer left every column too narrow to read. A card gives each of
 * those its own line and lets two sit side by side.
 *
 * The whole card is the way into the match, including the gaps between things:
 * the link is a layer over the card and the controls are lifted above it. A
 * wrapper would have made the buttons illegal children of a link, and a layer
 * *behind* them left every empty patch of the card dead to a click.
 */
export function MatchCard({
  match,
  href,
  onNavigate,
  isNext,
  now,
  organizer,
  selected,
  onSelect,
  onLineup,
  onGallery,
  onEdit,
  onDelete,
}: {
  match: MatchSummary;
  /** Null for the match already on screen: there is nowhere to go. */
  href: string | null;
  onNavigate: () => void;
  isNext: boolean;
  now: number | null;
  /** Name of whoever is running it, looked up from the squad. */
  organizer?: string;
  selected?: boolean;
  onSelect?: () => void;
  onLineup: () => void;
  onGallery: () => void;
  /** Absent once the match has started: a played fixture is a record. */
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t, locale } = useLocale();
  const live = now !== null && isLive(match.playedAt, match.endsAt, now);
  const share = perPlayer(match.place?.price, match.playerCount);

  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border bg-card/60 transition-colors",
        selected ? "border-primary" : "border-border/70",
        href && "hover:border-border hover:bg-accent/30",
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-label={fill(t.matches.openDate, {
            date: formatShortDate(match.playedAt, locale),
          })}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            onNavigate();
          }}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        />
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-4 pb-0">
        <header className="flex items-start gap-2.5">
          {onSelect ? (
            <Checkbox
              className="relative z-20 mt-1"
              checked={!!selected}
              onCheckedChange={onSelect}
              aria-label={fill(t.matches.selectDate, {
                date: formatShortDate(match.playedAt, locale),
              })}
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="font-display text-xl uppercase leading-tight tracking-[0.04em]">
              {formatShortDate(match.playedAt, locale)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatTimeRange(match.playedAt, match.endsAt)} ·{" "}
              {relativeLabel(match.playedAt, undefined, locale, t.common)}
            </p>
          </div>

          {live ? (
            <LiveBadge />
          ) : isNext ? (
            <Badge>{t.matches.onPitch}</Badge>
          ) : null}
        </header>

        <dl className="space-y-2 text-[0.9375rem] text-muted-foreground">
          {match.place ? (
            match.place.mapsUrl ? (
              <AppLink
                href={match.place.mapsUrl}
                external
                icon={Location01Icon}
                className="relative z-20 flex w-fit"
              >
                {match.place.name}
              </AppLink>
            ) : (
              <div className="flex items-center gap-2">
                <Icon icon={Location01Icon} size={15} />
                <span className="min-w-0 truncate">{match.place.name}</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 opacity-50">
              <Icon icon={Location01Icon} size={15} />
              <span>{t.matches.noPlaceYet}</span>
            </div>
          )}

          {organizer ? (
            <div className="flex items-center gap-2">
              <Icon icon={UserStar01Icon} size={15} className="shrink-0" />
              <span className="min-w-0 truncate">{organizer}</span>
            </div>
          ) : null}

          {/* The lineup is a click away: the counts are the summary of it. */}
          <AppLink
            onClick={onLineup}
            icon={UserGroupIcon}
            className="relative z-20 flex w-fit"
            labelClassName="tabular-nums"
          >
            {match.playerCount} {match.playerCount === 1 ? "player" : "players"}
            {match.paidCount > 0
              ? fill(t.matches.paidSuffix, { count: match.paidCount })
              : ""}
          </AppLink>

          {share !== null ? (
            <p className="text-primary">
              <span className="tabular-nums">{formatMoney(share)}</span>{" "}
              {t.common.each}
            </p>
          ) : null}
        </dl>
      </div>

      {/* Always at the foot of the card, however tall its neighbour is. */}
      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
        {match.recurrence === "weekly" ? (
          <Badge variant="outline">
            <Icon icon={RepeatIcon} size={11} />
            {t.hud.weekly}
          </Badge>
        ) : (
          <span />
        )}

        <div className="relative z-20 flex items-center gap-1">
          {/* The album is open to everyone, like adding players. */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.matches.gallery}
            onClick={onGallery}
          >
            <Icon icon={Album02Icon} size={16} />
          </Button>

          {onEdit ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.matches.editMatch}
              onClick={onEdit}
            >
              <Icon icon={PencilEdit02Icon} size={16} />
            </Button>
          ) : null}

          {onDelete ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.matches.deleteMatch}
              className="text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Icon icon={Delete02Icon} size={16} />
            </Button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
