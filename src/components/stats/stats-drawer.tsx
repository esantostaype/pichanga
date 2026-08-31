"use client";

import {
  ChampionIcon,
  ChartLineData01Icon,
  FootballIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";

import { TeamCrest } from "@/components/matches/team-crest";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocale } from "@/components/providers/locale-provider";
import { fill } from "@/i18n/dictionaries";
import { api } from "@/lib/api-client";
import { formatShortDate } from "@/lib/date";
import type { PlayerStat, Stats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";

/**
 * The season.
 *
 * Two ways of reading the same goals: who scored them, and the night they were
 * scored on. Nothing here can be edited -- it is what happened.
 *
 * Fetched when the drawer opens rather than carried in the provider: it is the
 * one thing in the app nobody looks at until they ask for it, and it grows with
 * every match while the rest of the state does not.
 */
export function StatsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const { players, demo } = usePichanga();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"players" | "matches">("players");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    void api
      .stats(demo)
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, demo]);

  const byId = new Map(players.map((player) => [player.id, player]));
  const played = stats?.matches.length ?? 0;

  const podium = stats?.players.slice(0, PODIUM.length) ?? [];
  const rest = stats?.players.slice(PODIUM.length) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t.stats.title}</SheetTitle>
          <SheetDescription>
            {stats
              ? fill(t.stats.summary, {
                  count: played,
                  nights: played === 1 ? t.common.night : t.common.nights,
                  goals: stats.players.reduce(
                    (total, row) => total + row.goals,
                    0,
                  ),
                })
              : t.stats.counting}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-4">
          <Tabs
            ariaLabel={t.stats.title}
            value={tab}
            onChange={(next) => setTab(next as "players" | "matches")}
            items={[
              {
                value: "players",
                label: t.stats.tabPlayers,
              },
              {
                value: "matches",
                label: t.stats.tabNights,
              },
            ]}
          />

          {!stats ? (
            <StatsSkeleton />
          ) : played === 0 ? (
            <EmptyState
              icon={ChartLineData01Icon}
              title={t.stats.emptyTitle}
              description={t.stats.emptyLine}
            />
          ) : tab === "players" ? (
            <>
              <Podium rows={podium} players={byId} />

              {rest.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.stats.player}</TableHead>
                      <TableHead className="w-12 text-right">
                        {t.table.goals}
                      </TableHead>
                      <TableHead className="w-12 text-right">
                        {t.table.played}
                      </TableHead>
                      <TableHead className="w-20 text-right">
                        {t.table.record}
                      </TableHead>
                      <TableHead className="w-12 text-right">
                        {t.table.points}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rest.map((row, index) => {
                      const player = byId.get(row.playerId);

                      return (
                        <TableRow key={row.playerId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="w-4 shrink-0 text-right font-display text-xs tabular-nums text-muted-foreground">
                                {index + PODIUM.length + 1}
                              </span>

                              {player ? (
                                <PlayerAvatar
                                  player={player}
                                  className="size-8"
                                />
                              ) : null}

                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {player
                                    ? `${player.firstName} ${player.lastName}`
                                    : t.stats.left}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {row.matches}{" "}
                                  {row.matches === 1
                                    ? t.common.night
                                    : t.common.nights}
                                </span>
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1 font-display tabular-nums">
                              {row.goals > 0 ? (
                                <Icon
                                  icon={FootballIcon}
                                  size={13}
                                  className="text-primary"
                                />
                              ) : null}
                              {row.goals}
                            </span>
                          </TableCell>

                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {row.games}
                          </TableCell>

                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {row.won}-{row.drawn}-{row.lost}
                          </TableCell>

                          <TableCell className="text-right font-semibold tabular-nums">
                            {row.points}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : null}
            </>
          ) : (
            <ul className="space-y-3">
              {stats.matches.map((match) => {
                const scorer = match.topScorer
                  ? byId.get(match.topScorer.playerId)
                  : null;

                return (
                  <li
                    key={match.matchId}
                    className="rounded-2xl border border-border/70 bg-card/60 p-4"
                  >
                    <header className="flex items-baseline justify-between gap-3">
                      <p className="font-display text-lg uppercase tracking-[0.04em]">
                        {formatShortDate(match.playedAt, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.games}{" "}
                        {match.games === 1 ? t.common.game : t.common.games} ·{" "}
                        {match.goals}{" "}
                        {match.goals === 1 ? t.common.goal : t.common.goals}
                      </p>
                    </header>

                    {match.teams.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {match.teams.map((team) => (
                          <li
                            key={team.id}
                            className="flex items-center gap-2.5 text-sm"
                          >
                            <TeamCrest
                              name={team.name}
                              accent={team.accent}
                              size={20}
                            />
                            <span
                              className="min-w-0 flex-1 truncate"
                              style={{ color: team.accent }}
                            >
                              {team.name}
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {team.goalsFor}-{team.goalsAgainst}
                            </span>
                            <span className="w-8 shrink-0 text-right font-semibold tabular-nums">
                              {team.points}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t.stats.noSides}
                      </p>
                    )}

                    {scorer && match.topScorer ? (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon
                          icon={FootballIcon}
                          size={13}
                          className="text-primary"
                        />
                        {fill(t.stats.scored, {
                          name: `${scorer.firstName} ${scorer.lastName}`,
                          count: match.topScorer.goals,
                        })}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The three places, in metal.
 *
 * Fixed hex rather than theme tokens on purpose: gold, silver and bronze are
 * read as the medals themselves, and a palette that moved with the theme would
 * stop saying "first".
 */
const PODIUM = [
  { color: "#f2c53d", avatar: "size-20", cup: 22, step: "pt-8" },
  { color: "#c9d4e2", avatar: "size-16", cup: 19, step: "pt-5" },
  { color: "#c2814c", avatar: "size-14", cup: 19, step: "pt-3" },
] as const;

/**
 * The two rows every step ends with, at the height they always take.
 *
 * The steps are different heights and the faces are different sizes, so the
 * only way the names read as a row -- and the goals under them as another -- is
 * to build each card from the bottom up and fix what those two rows measure.
 */
const NAME_H = "h-9";
const FIGURES_H = "h-5";

/** Second, first, third -- the way a podium is stood on, not listed. */
const ORDER = [1, 0, 2] as const;

/**
 * The top three, on their steps.
 *
 * The winner is lifted by its own padding rather than by a taller box, so what
 * lines up across the three is the faces.
 */
function Podium({
  rows,
  players,
}: {
  rows: PlayerStat[];
  players: Map<string, Player>;
}) {
  const { t } = useLocale();
  if (rows.length === 0) return null;

  const standing = ORDER.filter((place) => rows[place]);

  return (
    <ol className="flex items-end justify-center gap-2">
      {standing.map((place) => {
        const row = rows[place];
        const medal = PODIUM[place];
        const player = players.get(row.playerId);

        return (
          <li
            key={row.playerId}
            className={cn(step, medal.step)}
            style={{ background: face(medal.color) }}
          >
            <Cup medal={medal} />

            {player ? (
              <PlayerAvatar
                player={player}
                className={cn(medal.avatar, "border-2")}
                style={{ borderColor: medal.color }}
              />
            ) : (
              <span className={cn(medal.avatar, "rounded-full bg-muted")} />
            )}

            <span
              className={cn(
                NAME_H,
                "flex min-w-0 max-w-full flex-col justify-end",
              )}
            >
              <span className="truncate text-sm font-semibold leading-5">
                {player ? player.firstName : t.stats.left}
              </span>
              <span className="truncate text-xs leading-4 text-muted-foreground">
                {player ? player.lastName : t.stats.leftLine}
              </span>
            </span>

            <span
              className={cn(
                FIGURES_H,
                "flex items-center gap-3 text-xs tabular-nums",
              )}
            >
              <span className="inline-flex items-center gap-1 font-display">
                <Icon icon={FootballIcon} size={12} className="text-primary" />
                {row.goals}
              </span>
              <span className="text-muted-foreground">{row.points} pts</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One step, less its metal.
 *
 * No border: the drawer already sits on a card, and a third outline around
 * three of them made the top of the table look like a toolbar. A wash of the
 * medal's own colour, fading into something a shade off the drawer, is enough
 * to say these three are a block.
 */
const step =
  "relative flex min-w-0 flex-1 flex-col items-center gap-2 overflow-hidden rounded-2xl px-2 pb-3 text-center";

const face = (color: string) =>
  `linear-gradient(180deg, ${color}33 0%, ${color}0f 55%, rgba(255,255,255,0.045) 100%)`;

/**
 * The medal, out of the way.
 *
 * In the corner rather than over the face: stacked above it, it pushed the
 * three steps apart by the height of a cup and nothing lined up underneath.
 */
function Cup({ medal }: { medal: (typeof PODIUM)[number] }) {
  return (
    <span className="absolute right-2 top-2" style={{ color: medal.color }}>
      <Icon icon={ChampionIcon} size={medal.cup} strokeWidth={1.2} />
    </span>
  );
}

/**
 * The same screen, drawn empty.
 *
 * Element for element: the three steps at their own heights, the column
 * headings, and rows built from the widths the table itself uses -- so when the
 * numbers land nothing moves except the ink.
 */
function StatsSkeleton() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex items-end justify-center gap-2">
        {ORDER.map((place) => {
          const medal = PODIUM[place];

          return (
            <li
              key={place}
              className={cn(step, medal.step)}
              style={{ background: "rgba(255,255,255,0.035)" }}
            >
              <Skeleton
                className="absolute right-2 top-2 rounded-md"
                style={{ height: medal.cup, width: medal.cup }}
              />
              <Skeleton className={cn(medal.avatar, "rounded-full")} />
              <span
                className={cn(
                  NAME_H,
                  "flex w-full flex-col items-center justify-end gap-1",
                )}
              >
                <Skeleton className="h-4 w-16 max-w-full" />
                <Skeleton className="h-3 w-12 max-w-full" />
              </span>
              <span className={cn(FIGURES_H, "flex items-center")}>
                <Skeleton className="h-3 w-20 max-w-full" />
              </span>
            </li>
          );
        })}
      </ol>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.stats.player}</TableHead>
            <TableHead className="w-12 text-right">{t.table.goals}</TableHead>
            <TableHead className="w-12 text-right">{t.table.played}</TableHead>
            <TableHead className="w-20 text-right">{t.table.record}</TableHead>
            <TableHead className="w-12 text-right">{t.table.points}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-4 shrink-0 rounded-sm" />
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32 max-w-full" />
                    <Skeleton className="h-3 w-14" />
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-5" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-12" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-5" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
