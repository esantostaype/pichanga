"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Delete02Icon,
  GloveIcon,
  InfinityCircleIcon,
  StopWatchIcon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";

import { useEffect, useState } from "react";

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
import { useAction } from "@/hooks/use-action";
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

  /*
   * Whether a game is being played right now, which is the one thing that
   * stops the gloves moving. Read when the dialog opens rather than carried
   * around: this is the only screen that asks, and the answer is one row.
   */
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!open || !match) return;

    let cancelled = false;

    void api.matches
      .live(match.id)
      .then((live) => {
        if (!cancelled) setPlaying(!!currentGame(live.games));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, match]);

  const { go } = useScene();

  /*
   * Off by default: strength alone is what most squads want, and mixing is the
   * thing you reach for when the draw came out as one floor against another.
   */
  const [mixAreas, setMixAreas] = useState(false);

  const shuffle = useAction(async () => drawTeams(newSeed(), mixAreas), {
    success: "Teams drawn again",
  });

  const length = useAction(async (minutes: number) => setGameMinutes(minutes), {
    success: "Game length agreed",
  });

  const gloves = useAction(
    async ({ teamId, playerId }: { teamId: string; playerId: string }) =>
      setKeeper(teamId, playerId),
    { success: "Keeper changed" },
  );

  /** Whose gloves are in flight, so the spinner sits on the right row. */
  const [handing, setHanding] = useState<string | null>(null);

  const handOver = (teamId: string, playerId: string) => {
    setHanding(playerId);
    void gloves.run({ teamId, playerId }).finally(() => setHanding(null));
  };

  const clear = useAction(async () => clearTeams(), {
    success: "Teams put away",
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
          <DialogTitle>Teams</DialogTitle>
          <DialogDescription>
            {teams.length === 0
              ? "Nobody has drawn the sides yet."
              : `${teams.length} sides, drawn from the skills on each profile.`}
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
                      {squad.length} {squad.length === 1 ? "player" : "players"}
                      {team.borrowedKeeper ? " · keeper borrowed" : ""}
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
                              ? "Nobody volunteered, so they are filling in"
                              : "In goal by choice"
                          }
                        >
                          {team.borrowedKeeper ? "In goal" : "Keeper"}
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
                          aria-label={`Put ${player.firstName} in goal`}
                          title={`Put ${player.firstName} in goal`}
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

        {/*
          Agreed here, before anybody kicks off, because this is the moment
          everyone is standing together looking at the same screen. It is not
          behind the session: the length of a game is settled out loud at the
          ground, and the phone that types it in is whichever one is out.
        */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:gap-4">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">Minutes per game</span>
            <span className="text-xs text-muted-foreground">
              How long a game runs before the sides change. The clock on match
              night turns amber near it and red at it.
              {teams.length === 2
                ? " Two sides can also play with no clock at all, for as long as the pitch is rented."
                : ""}
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
                      ? "No clock, one game all match"
                      : `${minutes} minutes`
                  }
                  title={
                    forever
                      ? "One game, for as long as the pitch is rented"
                      : `${minutes} minutes`
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

        {isAdmin ? (
          <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <Switch
              checked={mixAreas}
              onCheckedChange={setMixAreas}
              disabled={busy}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">Mix the areas</span>
              <span className="text-xs text-muted-foreground">
                Spreads the smaller areas across the sides, so a team is not one
                floor of the office. Strength still comes first.
              </span>
            </span>
          </label>
        ) : null}

        {match ? (
          <DialogFooter className="justify-between">
            {/*
              Where this dialog leads. The sides are drawn, so the next thing
              that happens is somebody keeping score -- and it is not an
              admin's button: whoever is holding the phone taps the goals.
            */}
            <Button
              variant="soft"
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
              Match night
            </Button>

            {isAdmin ? (
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
                  Put away
                </Button>
                <Button disabled={busy} onClick={() => void shuffle.run()}>
                  {shuffle.pending ? (
                    <Spinner />
                  ) : (
                    <Icon icon={ArrowDataTransferHorizontalIcon} size={16} />
                  )}
                  Shuffle again
                </Button>
              </span>
            ) : null}
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
