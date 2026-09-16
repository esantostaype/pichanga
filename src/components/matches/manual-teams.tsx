"use client";

import { PlusSignIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { PlayerAvatar } from "@/components/players/player-avatar";
import {
  SkillAverage,
  TeamAverage,
} from "@/components/players/skill-average";
import { PlayerPicker } from "@/components/players/player-picker";
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
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import type { Match, Player } from "@/types";
import { TeamCrest } from "./team-crest";

const MAX_SIDES = 6;

/**
 * The sides, built by hand.
 *
 * Everything here is staged: the arrangement lives in this component until it
 * is saved, and only then does it reach the match in one request. Two reasons.
 * A half-built arrangement has people on no side at all, and the pitch groups
 * by side -- anybody unassigned would simply vanish from it while somebody was
 * still deciding. And backing out has to cost nothing, because the whole point
 * of arranging by hand is trying it a couple of ways.
 *
 * Which is also why the draw is still what the button does. This is the second
 * answer, for the week the first one is not the one they want.
 */
export function ManualTeams({
  match,
  onDone,
}: {
  match: Match;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const { setTeamsManually } = usePichanga();

  const squad = match.players;
  const byId = useMemo(
    () => new Map(squad.map((player) => [player.id, player])),
    [squad],
  );

  /*
   * Seeded from the sides as they stand, so opening the tab shows what is
   * already there rather than an empty slate: most arrangements start as "the
   * draw, but those two swapped".
   */
  const [sides, setSides] = useState<string[][]>(() =>
    match.teams.length >= 2
      ? match.teams.map((team) => [...team.playerIds])
      : [[], []],
  );

  /** Which side has its picker open, or null. */
  const [picking, setPicking] = useState<number | null>(null);

  const placed = useMemo(() => new Set(sides.flat()), [sides]);
  const waiting = squad.filter((player) => !placed.has(player.id));

  const setCount = (count: number) =>
    setSides((prev) => {
      if (count === prev.length) return prev;

      // Growing adds empty sides; shrinking sends the tail back to the bench
      // rather than guessing where those people should go instead.
      return count > prev.length
        ? [...prev, ...Array.from({ length: count - prev.length }, () => [])]
        : prev.slice(0, count);
    });

  const addTo = (index: number, ids: string[]) =>
    setSides((prev) =>
      prev.map((side, at) =>
        at === index
          ? [...side, ...ids.filter((id) => !side.includes(id))]
          : side.filter((id) => !ids.includes(id)),
      ),
    );

  const removeFrom = (index: number, id: string) =>
    setSides((prev) =>
      prev.map((side, at) =>
        at === index ? side.filter((one) => one !== id) : side,
      ),
    );

  const save = useAction(async () => setTeamsManually(sides), {
    success: t.teams.manualSaved,
    onSuccess: onDone,
  });

  /* Every side needs somebody in it, and nobody may be left on the bench. */
  const ready = waiting.length === 0 && sides.every((side) => side.length > 0);

  const counts = Array.from(
    {
      length: Math.max(
        0,
        Math.min(MAX_SIDES, Math.floor(squad.length / 2)) - 1,
      ),
    },
    (_, index) => index + 2,
  );

  return (
    <div className="space-y-4">
      {/* How many, first: it is the shape of everything underneath it. */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:gap-4">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">{t.teams.sidesTitle}</span>
          <span className="text-xs text-muted-foreground">
            {t.teams.manualSidesLine}
          </span>
        </span>

        <span className="-mx-1 flex flex-wrap items-center gap-1">
          {counts.map((count) => {
            const picked = count === sides.length;

            return (
              <button
                key={count}
                type="button"
                disabled={save.pending}
                aria-pressed={picked}
                aria-label={fill(t.teams.sidesOne, { count })}
                onClick={() => setCount(count)}
                className={cn(
                  "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full font-display text-sm tabular-nums transition-colors disabled:cursor-default",
                  picked
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {count}
              </button>
            );
          })}
        </span>
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        {sides.map((side, index) => {
          const team = match.teams[index];
          const name =
            team?.name ?? fill(t.teams.sideNumber, { count: index + 1 });
          const accent = team?.accent ?? "#9ae600";

          return (
            <section
              key={index}
              className="rounded-2xl border p-4"
              style={{
                borderColor: `${accent}55`,
                backgroundColor: `color-mix(in oklab, ${accent} 12%, var(--background))`,
              }}
            >
              <header className="flex items-center gap-3">
                <TeamCrest name={name} accent={accent} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg uppercase tracking-[0.04em]">
                    {name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {side.length}{" "}
                    {side.length === 1 ? t.common.player : t.common.players}
                  </p>
                </div>

                {/*
                  Live while the arrangement is being built, which is the whole
                  point of having it here: it moves as people are dragged
                  across, so a lopsided pair shows before it is saved.
                */}
                <TeamAverage
                  players={side
                    .map((id) => byId.get(id))
                    .filter((one) => one !== undefined)}
                  accent={accent}
                />
              </header>

              {/*
                Dashed, and dashed even when it is full: it is a place things go
                into, and a border that only dots itself when empty would read
                as an error state rather than an invitation.
              */}
              <div className="mt-3 space-y-2 rounded-xl border border-dashed border-border/70 p-2.5">
                {side.length === 0 ? (
                  <p className="px-1 py-2 text-center text-xs text-muted-foreground">
                    {t.teams.sideEmpty}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {side.map((id) => {
                      const player = byId.get(id);
                      if (!player) return null;

                      return (
                        <li key={id} className="flex items-center gap-2.5">
                          <PlayerAvatar player={player} className="size-7" />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {player.firstName} {player.lastName}
                          </span>
                          <SkillAverage
                            player={player}
                            accent={accent}
                          />
                          <button
                            type="button"
                            disabled={save.pending}
                            onClick={() => removeFrom(index, id)}
                            aria-label={fill(t.teams.takeOut, {
                              name: player.firstName,
                            })}
                            title={fill(t.teams.takeOut, {
                              name: player.firstName,
                            })}
                            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-lg leading-none text-muted-foreground/70 transition-colors hover:text-destructive disabled:cursor-default"
                          >
                            &times;
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={save.pending}
                  onClick={() => setPicking(index)}
                >
                  <Icon icon={PlusSignIcon} />
                  {t.teams.addPlayers}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      {/*
        The bench. Only ever here while somebody is deciding -- saving is
        refused until it is empty, because a player on no side is a player the
        pitch cannot draw.
      */}
      {waiting.length > 0 ? (
        <div className="rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 px-4 py-3">
          <p className="text-sm font-medium text-amber-300">
            {fill(t.teams.waiting, { count: waiting.length })}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {waiting.map((player) => (
              <li
                key={player.id}
                className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-2 py-0.5 text-xs"
              >
                <PlayerAvatar player={player} className="size-5" />
                {player.firstName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DialogFooter className="justify-between">
        <Button variant="ghost" disabled={save.pending} onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button
          disabled={!ready || save.pending}
          onClick={() => void save.run()}
        >
          {save.pending ? <Spinner /> : <Icon icon={UserGroupIcon} />}
          {t.teams.manualSave}
        </Button>
      </DialogFooter>

      {picking !== null ? (
        <PickForSide
          open
          onOpenChange={(next) => !next && setPicking(null)}
          squad={squad}
          sides={sides}
          index={picking}
          teamName={
            match.teams[picking]?.name ??
            fill(t.teams.sideNumber, { count: picking + 1 })
          }
          onConfirm={(ids) => {
            addTo(picking, ids);
            setPicking(null);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Who goes on this side.
 *
 * The whole squad is offered, not only the bench: picking somebody who is on
 * another side moves them, which is half of what gets asked for and would
 * otherwise mean taking them off that side first.
 */
function PickForSide({
  open,
  onOpenChange,
  squad,
  sides,
  index,
  teamName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squad: Player[];
  sides: string[][];
  index: number;
  teamName: string;
  onConfirm: (ids: string[]) => void;
}) {
  const { t } = useLocale();
  const [chosen, setChosen] = useState<string[]>([]);

  const toggle = (id: string) =>
    setChosen((prev) =>
      prev.includes(id) ? prev.filter((one) => one !== id) : [...prev, id],
    );

  // Already on this side: shown ticked, and not worth ticking again.
  const mine = sides[index] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teamName}</DialogTitle>
          <DialogDescription>{t.teams.pickForSide}</DialogDescription>
        </DialogHeader>

        <PlayerPicker
          players={squad}
          selected={chosen}
          onToggle={toggle}
          lockedIds={mine}
          className="max-h-80"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={chosen.length === 0}
            onClick={() => onConfirm(chosen)}
          >
            {fill(t.teams.addCount, { count: chosen.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
