"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Delete02Icon,
  GloveIcon,
  InfinityCircleIcon,
  StopWatchIcon,
  UserStar01Icon,
  UserSwitchIcon,
} from "@hugeicons/core-free-icons";

import { useCallback, useEffect, useState } from "react";

import { useScene } from "@/components/layout/scene-transition";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { PlayerAvatar } from "@/components/players/player-avatar";
import {
  SkillAverage,
  TeamAverage,
} from "@/components/players/skill-average";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { useLocale } from "@/components/providers/locale-provider";
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api-client";
import { GAME_MINUTES_CHOICES, INDEFINITE_GAME } from "@/lib/constants";
import { matchSlug } from "@/lib/date";
import { currentGame } from "@/lib/live";

import { cn } from "@/lib/utils";
import type { Match } from "@/types";
import { ManualTeams } from "./manual-teams";
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
  const {
    isAdmin,
    drawTeams,
    clearTeams,
    setGameMinutes,
    setKeeper,
    setPlayerTeam,
    demo,
  } = usePichanga();
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

  /*
   * How many sides the next shuffle should make. Null is the turnout deciding,
   * which is what it always did and what it should keep doing while nobody has
   * an opinion: adding two players to a six-a-side night is meant to move it
   * from two sides to three on its own.
   */
  const [sides, setSides] = useState<number | null>(null);

  /*
   * Auto is where this opens and stays: pressing the button already drew the
   * sides, and the balancer is right most weeks. Manual is the second answer,
   * for the week it is not -- and it is a tab rather than a mode so that
   * leaving it costs nothing.
   */
  const [tab, setTab] = useState<"auto" | "manual">("auto");


  const shuffle = useAction(
    async () => drawTeams(newSeed(), mixAreas, sides ?? undefined),
    { success: t.teams.shuffled },
  );

  /*
   * Moving one player, which leaves the sides themselves alone: same names,
   * same colours, one different shirt. The draw balances on numbers and cannot
   * know that these two have to be split up.
   */
  const [moving, setMoving] = useState<string | null>(null);

  const move = useAction(
    async ({ teamId, playerId }: { teamId: string; playerId: string }) =>
      setPlayerTeam(teamId, playerId),
    { success: t.teams.moved },
  );

  const moveTo = (teamId: string, playerId: string) => {
    setMoving(playerId);
    void move.run({ teamId, playerId }).finally(() => setMoving(null));
  };

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
  const busy = shuffle.pending || clear.pending || move.pending;

  /*
   * Two sides at least, and never more than there are pairs to fill them: six
   * people cannot be four teams of anything worth playing. Capped at six,
   * which is already more sides than a pitch has room to rotate.
   */
  /*
   * The same shape for both forms of the control, so a row with two sides and
   * a row with three do not look like different features.
   */
  const moveChip = cn(
    "grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border border-border/70 bg-background/50 text-muted-foreground transition-colors",
    "hover:border-border hover:bg-background hover:text-foreground disabled:cursor-default disabled:opacity-50",
  );

  const squad = match?.players.length ?? 0;
  const sideChoices = Array.from(
    { length: Math.max(0, Math.min(6, Math.floor(squad / 2)) - 1) },
    (_, index) => index + 2,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closed on Manual, reopened on Auto. A dialog that comes back on the
        // tab somebody walked away from comes back halfway through an
        // arrangement they had already abandoned.
        if (!next) setTab("auto");
        onOpenChange(next);
      }}
    >
      <DialogContent className={widthFor(teams.length)}>
        <DialogHeader>
          <DialogTitle>{t.teams.title}</DialogTitle>
          <DialogDescription>
            {teams.length === 0
              ? t.teams.none
              : fill(started ? t.teams.started : t.teams.drawn, {
                  count: teams.length,
                })}
            {/*
              Said out loud, because the two controls on a player's row are
              13px glyphs and nobody goes looking for a feature they cannot
              see. It costs one line and saves the question.
            */}
            {teams.length > 1 && isAdmin && !started
              ? ` ${t.teams.moveHint}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {/*
          Auto is what the button already did; Manual is the other way of
          answering the same question. Only offered where it can be acted on:
          a guest cannot rearrange anything, and once a game has been played
          neither can anybody else.
        */}
        {isAdmin && !started && teams.length > 0 ? (
          <Tabs
            items={[
              { value: "auto", label: t.teams.tabAuto },
              { value: "manual", label: t.teams.tabManual },
            ]}
            value={tab}
            onChange={(next) => setTab(next as "auto" | "manual")}
            ariaLabel={t.teams.title}
          />
        ) : null}

        {tab === "manual" && match ? (
          <ManualTeams match={match} onDone={() => setTab("auto")} />
        ) : (
          <>

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

            /* Where this player could go, and whether anyone may send them. */
            const others = teams.filter((side) => side.id !== team.id);
            const canMove = isAdmin && !started && others.length > 0;

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
                  <TeamCrest name={team.name} accent={team.accent} />
                  <div className="min-w-0 flex-1">
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

                  {/*
                    What the two sides are actually being compared on. Two
                    circles reading 3.1 and 3.2 are a fair draw; 2.4 against
                    3.9 is the argument nobody was having out loud.
                  */}
                  <TeamAverage players={squad} accent={team.accent} />
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

                      {/*
                        Moving somebody is an admin's call, and only until the
                        first whistle: the table is kept on these sides, and a
                        player who changes shirt halfway through makes the
                        standings a record of nothing. The server holds the
                        same rule.

                        Bordered rather than bare. It began as a naked glyph
                        beside the glove and the first person to look for it
                        asked where it was: at 13px, two grey outlines in a row
                        are one grey smudge, and neither of them looks like
                        something you can press.
                      */}
                      {canMove ? (
                        others.length === 1 ? (
                          /*
                            One other side is not a menu. Two teams is the
                            common case and the answer is never in doubt, so
                            the tap does the thing instead of asking which.
                          */
                          <button
                            type="button"
                            disabled={move.pending}
                            aria-label={fill(t.teams.moveToTeam, {
                              name: player.firstName,
                              team: others[0].name,
                            })}
                            title={fill(t.teams.moveToTeam, {
                              name: player.firstName,
                              team: others[0].name,
                            })}
                            onClick={() => moveTo(others[0].id, player.id)}
                            className={moveChip}
                          >
                            {moving === player.id ? (
                              <Spinner />
                            ) : (
                              <Icon icon={UserSwitchIcon} />
                            )}
                          </button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              disabled={move.pending}
                              aria-label={fill(t.teams.moveName, {
                                name: player.firstName,
                              })}
                              title={fill(t.teams.moveName, {
                                name: player.firstName,
                              })}
                              className={moveChip}
                            >
                              {moving === player.id ? (
                                <Spinner />
                              ) : (
                                <Icon icon={UserSwitchIcon} />
                              )}
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                {t.teams.moveTo}
                              </DropdownMenuLabel>
                              {others.map((side) => (
                                <DropdownMenuItem
                                  key={side.id}
                                  onSelect={() => moveTo(side.id, player.id)}
                                >
                                  <TeamCrest
                                    name={side.name}
                                    accent={side.accent}
                                  />
                                  <span className="min-w-0 flex-1 truncate">
                                    {side.name}
                                  </span>
                                  <span className="text-xs tabular-nums text-muted-foreground">
                                    {side.playerIds.length}
                                  </span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      ) : null}

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
                            <Spinner />
                          ) : (
                            <Icon icon={GloveIcon} />
                          )}
                        </button>
                      )}

                      {player.id === match?.organizerId ? (
                        <Icon
                          icon={UserStar01Icon}
                         
                          className="text-primary"
                        />
                      ) : null}

                      <SkillAverage
                        player={player}
                        accent={team.accent}
                      />
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
                        <Icon icon={InfinityCircleIcon} />
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
          /*
            Sits with the shuffle it feeds, not with the sides above it: it
            changes nothing on screen until the draw is run again, and a
            control that looks like it edits what you are looking at but only
            takes effect on the next press is a control that lies.
          */
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:gap-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">{t.teams.sidesTitle}</span>
              <span className="text-xs text-muted-foreground">
                {t.teams.sidesLine}
              </span>
            </span>

            <span className="-mx-1 flex flex-wrap items-center gap-1">
              {[null, ...sideChoices].map((count) => {
                const picked = count === sides;
                const label =
                  count === null
                    ? t.teams.sidesAuto
                    : fill(t.teams.sidesOne, { count });

                return (
                  <button
                    key={count ?? "auto"}
                    type="button"
                    disabled={busy}
                    aria-pressed={picked}
                    aria-label={label}
                    title={label}
                    onClick={() => setSides(count)}
                    className={cn(
                      "grid h-9 shrink-0 cursor-pointer place-items-center rounded-full px-3 font-display text-sm tabular-nums transition-colors disabled:cursor-default",
                      picked
                        ? "bg-primary/15 font-semibold text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {count ?? t.teams.sidesAuto}
                  </button>
                );
              })}
            </span>
          </div>
        ) : null}

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
                    <Icon icon={Delete02Icon} />
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
                    <Icon icon={ArrowDataTransferHorizontalIcon} />
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
              <Icon icon={StopWatchIcon} />
              {t.teams.matchNight}
            </Button>
          </DialogFooter>
        ) : null}
          </>
        )}
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
export function widthFor(teams: number) {
  if (teams <= 2) return "max-w-2xl";
  if (teams === 3) return "max-w-5xl";
  return "max-w-7xl";
}

/** A fresh draw every time it is asked for. */
export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}
