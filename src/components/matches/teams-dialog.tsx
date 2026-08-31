"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Delete02Icon,
  GloveIcon,
  InfinityCircleIcon,
  StopWatchIcon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";

import { useCallback, useEffect, useState } from "react";

import { useScene } from "@/components/layout/scene-transition";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/components/providers/locale-provider";
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api-client";
import { GAME_MINUTES_CHOICES, INDEFINITE_GAME } from "@/lib/constants";
import { matchSlug } from "@/lib/date";
import { currentGame } from "@/lib/live";
import { strengthOf } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { Match } from "@/types";
import { TeamCrest } from "./team-crest";

/**
 * The sides, once they are drawn.
 *
 * Shuffling again is behind the session on purpose. Anybody can draw the teams
 * -- it happens with everyone standing around and somebody has to press it --
 * but a squad that can re-roll until it likes the look of a team has not been
 * given teams at all.
 */
export function TeamsDialog({
  open,
  onOpenChange,
  match,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
}) {
  const { isAdmin, drawTeams, clearTeams, setGameMinutes, setKeeper, demo } =
    usePichanga();
  const { t } = useLocale();

  /*
   * How far the night has got, which is what decides half of this dialog: a
   * game being played stops the gloves moving, and a game having been played
   * at all settles the sides.
   *
   * Read when it opens and again whenever the night changes, because the
   * kick-off usually happens on somebody else's phone -- and a screen still
   * offering to shuffle the sides two minutes after the first whistle is a
   * screen lying about what it can do.
   */
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const matchId = match?.id ?? null;

  const readNight = useCallback(() => {
    if (!matchId) return;

    void api.matches
      .live(matchId)
      .then((live) => {
        setPlaying(!!currentGame(live.games));
        setStarted(live.games.length > 0);
      })
      .catch(() => undefined);
  }, [matchId]);

  useEffect(() => {
    if (open) readNight();
  }, [open, readNight]);

  useRealtime({
    "live:changed": (payload) => {
      if ((payload as { matchId?: string })?.matchId !== matchId) return;
      readNight();
    },
  });

  const { go } = useScene();

  /*
   * Off by default: strength alone is what most squads want, and mixing is the
   * thing you reach for when the draw came out as one floor against another.
   */
  const [mixAreas, setMixAreas] = useState(false);

  const shuffle = useAction(async () => drawTeams(newSeed(), mixAreas), {
    success: t.teams.shuffled,
  });

  const length = useAction(async (minutes: number) => setGameMinutes(minutes), {
    success: t.teams.lengthAgreed,
  });

  const gloves = useAction(
    async ({ teamId, playerId }: { teamId: string; playerId: string }) =>
      setKeeper(teamId, playerId),
    { success: t.teams.keeperChanged },
  );

  /** Whose gloves are in flight, so the spinner sits on the right row. */
  const [handing, setHanding] = useState<string | null>(null);

  const handOver = (teamId: string, playerId: string) => {
    setHanding(playerId);
    void gloves.run({ teamId, playerId }).finally(() => setHanding(null));
  };

  const clear = useAction(async () => clearTeams(), {
    success: t.teams.putAwayDone,
    onSuccess: () => onOpenChange(false),
  });

  const teams = match?.teams ?? [];

  /*
   * Three sides or more with a game on: the gloves stay put. Somebody is
   * waiting to come on and the table is being kept on the result. With two
   * there is nobody to be unfair to, so they can move whenever those two
   * agree -- which is how a pickup game actually works. The server holds the
   * same rule; this only decides whether to offer it.
   */
  const keeperLocked = playing && teams.length > 2;

  /*
   * Two sides can play with no clock at all: the game is the match, and it
   * ends when the pitch does. With three there is always somebody waiting for
   * it to end, so it is not offered -- and the server refuses it anyway.
   */
  const choices =
    teams.length === 2
      ? [...GAME_MINUTES_CHOICES, INDEFINITE_GAME]
      : [...GAME_MINUTES_CHOICES];
  const byId = new Map((match?.players ?? []).map((one) => [one.id, one]));
  const busy = shuffle.pending || clear.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={widthFor(teams.length)}>
        <DialogHeader>
          <DialogTitle>{t.teams.title}</DialogTitle>
          <DialogDescription>
            {teams.length === 0
              ? t.teams.none
              : fill(started ? t.teams.started : t.teams.drawn, {
                  count: teams.length,
                })}
          </DialogDescription>
        </DialogHeader>

        {/*
          As many sides across as the width allows, and the rest underneath.
          `auto-fit` with a floor of 15rem is what decides that, not a column
          count: three teams on a laptop are a row of three, the same three on a
          tablet are two and one, and nothing needs a breakpoint per turnout.
        */}
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
          {teams.map((team) => {
            const squad = team.playerIds
              .map((id) => byId.get(id))
              .filter((one) => one !== undefined);

            return (
              <section
                key={team.id}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: `${team.accent}55`,
                  backgroundColor: `color-mix(in oklab, ${team.accent} 12%, var(--background))`,
                }}
              >
                <header className="flex items-center gap-3">
                  <TeamCrest name={team.name} accent={team.accent} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg uppercase tracking-[0.04em]">
                      {team.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {squad.length}{" "}
                      {squad.length === 1 ? t.common.player : t.common.players}
                      {team.borrowedKeeper
                        ? ` · ${t.teams.keeperBorrowed}`
                        : ""}
                    </p>
                  </div>
                </header>

                <ul className="mt-3 space-y-1.5">
                  {squad.map((player) => (
                    <li
                      key={player.id}
                      className="group/player flex items-center gap-2.5"
                    >
                      <PlayerAvatar player={player} className="size-7" />

                      <span className="min-w-0 flex-1 truncate text-sm">
                        {player.firstName} {player.lastName}
                      </span>

                      {player.id === team.keeperId ? (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-xs uppercase tracking-wider"
                          style={{
                            color: team.accent,
                            backgroundColor: `${team.accent}1f`,
                          }}
                          title={
                            team.borrowedKeeper
                              ? t.teams.keeperFillingIn
                              : t.teams.keeperByChoice
                          }
                        >
                          {team.borrowedKeeper
                            ? t.teams.inGoal
                            : t.teams.keeper}
                        </span>
                      ) : keeperLocked ? null : (
                        /*
                          The app names a keeper and is usually right, but it
                          cannot know whose knee hurts. Quiet rather than
                          hidden: a control that only exists on hover is a
                          control nobody finds, and this one answers a question
                          people ask out loud every week.
                        */
                        <button
                          type="button"
                          disabled={gloves.pending}
                          onClick={() => handOver(team.id, player.id)}
                          aria-label={fill(t.pitch.putInGoal, {
                            name: player.firstName,
                          })}
                          title={fill(t.pitch.putInGoal, {
                            name: player.firstName,
                          })}
                          className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground disabled:cursor-default"
                        >
                          {handing === player.id ? (
                            <Spinner size={13} />
                          ) : (
                            <Icon icon={GloveIcon} size={13} />
                          )}
                        </button>
                      )}

                      {player.id === match?.organizerId ? (
                        <Icon
                          icon={UserStar01Icon}
                          size={13}
                          className="text-primary"
                        />
                      ) : null}

                      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                        {strengthOf(
                          player,
                          player.id === team.keeperId ? "gk" : undefined,
                        ).toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {started ? null : (
          <>
            {/*
              Agreed here, before anybody kicks off, because this is the moment
              everyone is standing together looking at the same screen. It is not
              behind the session: the length of a game is settled out loud at the
              ground, and the phone that types it in is whichever one is out.

              It goes once a game has been played: those are in the table at
              the length they were played to, and moving it afterwards only
              changes what the clock calls late.
            */}
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:gap-4">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">
                  {t.teams.minutesTitle}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.teams.minutesLine}
                  {teams.length === 2 ? t.teams.minutesTwoSides : ""}
                </span>
              </span>

              <span className="-mx-1 flex flex-wrap items-center gap-1">
                {choices.map((minutes) => {
                  const picked = minutes === (match?.gameMinutes ?? -1);
                  const forever = minutes === INDEFINITE_GAME;

                  return (
                    <button
                      key={minutes}
                      type="button"
                      disabled={length.pending}
                      aria-pressed={picked}
                      aria-label={
                        forever
                          ? t.teams.noClock
                          : fill(t.teams.minutesOne, { count: minutes })
                      }
                      title={
                        forever
                          ? t.teams.noClockTitle
                          : fill(t.teams.minutesOne, { count: minutes })
                      }
                      onClick={() => void length.run(minutes)}
                      className={cn(
                        // A fixed square, so every one of them is the same
                        // circle whether it says 5 or 20.
                        "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full font-display text-sm tabular-nums transition-colors disabled:cursor-default",
                        picked
                          ? "bg-primary/15 font-semibold text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {forever ? (
                        <Icon icon={InfinityCircleIcon} size={18} />
                      ) : (
                        minutes
                      )}
                    </button>
                  );
                })}
              </span>
            </div>
          </>
        )}

        {isAdmin && !started ? (
          <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <Switch
              checked={mixAreas}
              onCheckedChange={setMixAreas}
              disabled={busy}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t.teams.mixTitle}</span>
              <span className="text-xs text-muted-foreground">
                {t.teams.mixLine}
              </span>
            </span>
          </label>
        ) : null}

        {match ? (
          <DialogFooter className="justify-between">
            {/*
              The undoing on the left and the way forward on the right, which
              is the order they happen in. Both of the left pair disappear once
              a game has been played: redrawing the sides then is not a redraw
              but a delete -- the games and the goals hang off the team rows.
            */}
            {isAdmin && !started ? (
              <span className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void clear.run()}
                >
                  {clear.pending ? (
                    <Spinner />
                  ) : (
                    <Icon icon={Delete02Icon} size={16} />
                  )}
                  {t.teams.putAway}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void shuffle.run()}
                >
                  {shuffle.pending ? (
                    <Spinner />
                  ) : (
                    <Icon icon={ArrowDataTransferHorizontalIcon} size={16} />
                  )}
                  {t.teams.shuffle}
                </Button>
              </span>
            ) : (
              <span />
            )}

            {/*
              Where this dialog leads, and the one thing on it worth pressing:
              the sides are drawn, so the next thing that happens is somebody
              keeping score. Not an admin's button -- whoever is holding the
              phone taps the goals.
            */}
            <Button
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                go(
                  demo
                    ? "/demo/live"
                    : `/match/${matchSlug(match.playedAt)}/live`,
                );
              }}
            >
              <Icon icon={StopWatchIcon} size={16} />
              {t.teams.matchNight}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * How wide the dialog opens: enough for the sides to sit next to each other.
 *
 * Two is the pair it has always been. Three or more earns the room to line them
 * up -- reading a triangular in a column means scrolling past one team to
 * compare it with another. The screen caps all of it: the box is `w-full`
 * underneath, so on a phone every one of these is the same width.
 */
function widthFor(teams: number) {
  if (teams <= 2) return "max-w-2xl";
  if (teams === 3) return "max-w-5xl";
  return "max-w-7xl";
}

/** A fresh draw every time it is asked for. */
export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}
