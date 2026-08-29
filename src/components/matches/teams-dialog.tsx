"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Delete02Icon,
  StopWatchIcon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";

import { useState } from "react";

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
import { matchSlug } from "@/lib/date";
import { strengthOf } from "@/lib/teams";
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
  const { isAdmin, drawTeams, clearTeams, demo } = usePichanga();
  const { go } = useScene();

  /*
   * Off by default: strength alone is what most squads want, and mixing is the
   * thing you reach for when the draw came out as one floor against another.
   */
  const [mixAreas, setMixAreas] = useState(false);

  const shuffle = useAction(async () => drawTeams(newSeed(), mixAreas), {
    success: "Teams drawn again",
  });

  const clear = useAction(async () => clearTeams(), {
    success: "Teams put away",
    onSuccess: () => onOpenChange(false),
  });

  const teams = match?.teams ?? [];
  const byId = new Map((match?.players ?? []).map((one) => [one.id, one]));
  const busy = shuffle.pending || clear.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Teams</DialogTitle>
          <DialogDescription>
            {teams.length === 0
              ? "Nobody has drawn the sides yet."
              : `${teams.length} sides, drawn from the skills on each profile.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => {
            const squad = team.playerIds
              .map((id) => byId.get(id))
              .filter((one) => one !== undefined);

            return (
              <section
                key={team.id}
                className="rounded-2xl border border-border/70 bg-card/60 p-4"
                style={{ borderColor: `${team.accent}55` }}
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
                    <li key={player.id} className="flex items-center gap-2.5">
                      <PlayerAvatar player={player} className="size-7" />

                      <span className="min-w-0 flex-1 truncate text-sm">
                        {player.firstName} {player.lastName}
                      </span>

                      {player.id === team.keeperId ? (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[0.6875rem] uppercase tracking-wider"
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
                      ) : null}

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

/** A fresh draw every time it is asked for. */
export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}
