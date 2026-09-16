"use client";

import { strengthOf } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { Player } from "@/types";
import { areaColor } from "./area-badge";

/**
 * One size, everywhere.
 *
 * It started as a `size` prop each view set for itself, and the pitch asked for
 * a circle scaled off its token: at 14px the number inside was 9px and could
 * not be read at all. A figure that means the same thing on every screen should
 * be the same object on every screen, so there is nothing left to set.
 */
const SIDE = 24;

/** The family and the size the area label beside it is set in. */
const shape = cn(
  "inline-grid shrink-0 place-items-center rounded-full",
  "font-display text-[0.8125rem] font-semibold leading-none tabular-nums",
);

/*
 * Square by three means at once. `width`/`height` fix it, `aspect-ratio` holds
 * it if either one is ever overridden, and `flex-shrink: 0` stops a long name
 * in a flex row from squeezing it into an oval -- which is the one thing a
 * circle with a number in it cannot survive looking like.
 */
const box = {
  width: SIDE,
  height: SIDE,
  aspectRatio: "1 / 1",
} as const;

/**
 * The colour, the way the scoreboard does it.
 *
 * The first version filled the circle with the colour and put white on top,
 * which reads on a saturated blue and fails completely on the five pale areas:
 * Dev is lime, Guest is a pale grey, and white on those is a circle with
 * nothing in it. Tinting the ground instead and writing in the colour itself
 * needs no exception for any of them -- the ink is always the colour against
 * almost-background, so all fourteen land at the same contrast.
 *
 * The same three lines `Digit` uses for the score, because it is the same
 * idea: a number belonging to a side, shown in that side's colour.
 */
const paint = (accent: string) => ({
  backgroundColor: `color-mix(in oklab, ${accent} 12%, var(--background))`,
  border: `1px solid color-mix(in oklab, ${accent} 42%, var(--background))`,
  color: accent,
});

/**
 * A player's number, in a circle.
 *
 * The same figure the balancer works from -- `strengthOf`, the six skills
 * weighted for where they play -- so the number somebody reads next to a face
 * is the number that decided which side they ended up on. Two different
 * averages on one screen would be one too many.
 *
 * Coloured by area, or by the side when the player is being shown as part of
 * one: on the pitch a player is their team first, and a row of area colours
 * there would argue with the shirt they are standing in.
 */
export function SkillAverage({
  player,
  accent,
  className,
}: {
  player: Player;
  /** A team colour, when the player is being shown as part of a side. */
  accent?: string;
  className?: string;
}) {
  const value = strengthOf(player);

  return (
    <span
      title={value.toFixed(1)}
      className={cn(shape, className)}
      style={{ ...box, ...paint(accent ?? areaColor(player.area)) }}
    >
      {value.toFixed(1)}
    </span>
  );
}

/**
 * The same, for a side: the mean of the numbers in it.
 *
 * Which is what a squad actually wants to compare. Two circles reading 3.1 and
 * 3.2 are a fair draw; the pair of them saying 2.4 and 3.9 is the argument
 * nobody was having out loud.
 */
export function TeamAverage({
  players,
  accent,
  className,
}: {
  players: Player[];
  accent: string;
  className?: string;
}) {
  if (players.length === 0) return null;

  const value =
    players.reduce((total, player) => total + strengthOf(player), 0) /
    players.length;

  return (
    <span
      title={value.toFixed(1)}
      className={cn(shape, className)}
      style={{ ...box, ...paint(accent) }}
    >
      {value.toFixed(1)}
    </span>
  );
}
