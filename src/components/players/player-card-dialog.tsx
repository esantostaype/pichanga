"use client";

import { UserStar01Icon } from "@hugeicons/core-free-icons";

import { areaColor } from "@/components/players/area-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import {
  SKILLS,
  SKILL_MAX,
  SKILL_MIN,
  getArea,
  getPosition,
} from "@/lib/constants";
import { strengthOf } from "@/lib/teams";
import type { Player } from "@/types";

/**
 * A player, as the card they would be if this were a game.
 *
 * Everything on it is already in the app somewhere -- the photo in the lineup,
 * the area on the pitch, the skills in the edit form -- but scattered across
 * three screens and one of them a form. Gathered onto one card in the colour of
 * their area, with the shape of their six skills drawn out, it is the only
 * place that answers "what is this person actually like on a pitch".
 *
 * The overall in the corner is the same number the balancer uses, weighed by
 * the position they picked, so the card explains the teams rather than being
 * decoration next to them.
 */
export function PlayerCardDialog({
  open,
  onOpenChange,
  player,
  isOrganizer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
  isOrganizer?: boolean;
}) {
  if (!player) return null;

  const area = getArea(player.area);
  const color = areaColor(player.area);
  const position = getPosition(player.position);
  const overall = strengthOf(player);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden p-0">
        {/* The dialog needs a name and a description; the card is the heading. */}
        <DialogTitle className="sr-only">
          {player.firstName} {player.lastName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {position.label} · {area.label} · overall {overall.toFixed(1)} out of 5
        </DialogDescription>

        <div
          className="relative px-6 pb-6 pt-8"
          style={{
            // The area colour bleeds down from the top and gives out before the
            // skills, so the card is tinted rather than painted.
            background: `linear-gradient(180deg, ${color}2e 0%, ${color}0f 38%, transparent 72%)`,
          }}
        >
          <div className="flex items-start gap-4">
            <span className="relative shrink-0">
              <PlayerAvatar
                player={player}
                className="size-24"
                style={{
                  outline: `3px solid ${color}`,
                  outlineOffset: "-3px",
                }}
              />
              {isOrganizer ? (
                <span
                  className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
                  title="Runs the match"
                >
                  <Icon icon={UserStar01Icon} size={15} strokeWidth={2} />
                </span>
              ) : null}
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <p className="font-display text-2xl uppercase leading-none tracking-[0.03em]">
                {player.firstName}
              </p>
              <p className="font-display text-2xl uppercase leading-tight tracking-[0.03em]">
                {player.lastName}
              </p>

              <p
                className="mt-2 font-display text-xs uppercase tracking-[0.2em]"
                style={{ color }}
              >
                {area.label}
              </p>
            </div>

            {/* The overall, where a card always puts it. */}
            <div className="shrink-0 text-right">
              <p className="font-display text-4xl leading-none tabular-nums">
                {overall.toFixed(1)}
              </p>
              <p className="mt-1 font-display text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                {position.short}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <SkillWeb player={player} color={color} />

            <ul className="min-w-0 flex-1 space-y-2">
              {SKILLS.map((skill) => {
                const value = player.skills[skill.id] ?? SKILL_MIN;

                return (
                  <li key={skill.id} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 truncate text-xs uppercase tracking-wider text-muted-foreground">
                      {skill.label}
                    </span>

                    <span className="flex flex-1 items-center gap-[3px]">
                      {Array.from({ length: SKILL_MAX }, (_, step) => (
                        <span
                          key={step}
                          className="h-1.5 flex-1 rounded-full"
                          style={{
                            backgroundColor:
                              step < value ? color : "var(--secondary)",
                          }}
                        />
                      ))}
                    </span>

                    <span className="w-3 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {value}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Plays as {position.label.toLowerCase()}. The shape is what the
            balancer reads when it draws the teams.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The six skills as a hexagon.
 *
 * Six bars say the same numbers, and the list beside this one does exactly
 * that -- but the shape is what gets remembered: a forward and a defender with
 * the same overall look nothing alike here.
 */
function SkillWeb({
  player,
  color,
  size = 128,
}: {
  player: Player;
  color: string;
  size?: number;
}) {
  const centre = size / 2;
  const radius = centre - 10;

  const point = (index: number, ratio: number) => {
    // Starts at the top and goes clockwise, so the first skill is the one the
    // list beside it starts with.
    const angle = (Math.PI * 2 * index) / SKILLS.length - Math.PI / 2;
    return [
      centre + Math.cos(angle) * radius * ratio,
      centre + Math.sin(angle) * radius * ratio,
    ] as const;
  };

  const ring = (ratio: number) =>
    SKILLS.map((_, index) => point(index, ratio).join(",")).join(" ");

  const shape = SKILLS.map((skill, index) => {
    const value = player.skills[skill.id] ?? SKILL_MIN;
    // Floored at a fifth so a player rated 1 everywhere is still a shape and
    // not a dot in the middle.
    return point(index, Math.max(value / SKILL_MAX, 0.2)).join(",");
  }).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-hidden
    >
      {[1, 0.66, 0.33].map((ratio) => (
        <polygon
          key={ratio}
          points={ring(ratio)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}

      {SKILLS.map((_, index) => {
        const [x, y] = point(index, 1);
        return (
          <line
            key={index}
            x1={centre}
            y1={centre}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}

      <polygon
        points={shape}
        fill={color}
        fillOpacity={0.28}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
