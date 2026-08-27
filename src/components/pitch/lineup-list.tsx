"use client";

import { Cancel01Icon, CrownIcon } from "@hugeicons/core-free-icons";

import { areaColor } from "@/components/players/area-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Icon } from "@/components/ui/icon";
import { getArea } from "@/lib/constants";
import type { Player } from "@/types";
import { PaidMark } from "./paid-mark";

/**
 * The lineup as a list, over the pitch rather than on it.
 *
 * On a phone the formation still places twenty-four tokens comfortably -- they
 * come out around 40px -- but the name plate under each one is a fifth of that,
 * seven or eight pixels, which nobody can read. So the pitch stays as the
 * backdrop it always was and the players line up over it, photo on the left and
 * name on the right, the same shape as the share card.
 */
export function LineupList({
  players,
  paidPlayerIds,
  organizerId,
  columns,
  insetTop,
  insetBottom,
  onRemovePlayer,
  onTogglePaid,
}: {
  players: Player[];
  /** Undefined leaves the payment marks off, as on the pitch. */
  paidPlayerIds?: string[];
  organizerId?: string | null;
  columns: 1 | 2;
  insetTop: number;
  insetBottom: number;
  onRemovePlayer?: (player: Player) => void;
  onTogglePaid?: (player: Player, paid: boolean) => void;
}) {
  return (
    <div
      className="absolute inset-0 overflow-y-auto overscroll-contain px-3 scrollbar-thin"
      style={{ paddingTop: insetTop, paddingBottom: insetBottom }}
    >
      {/*
        Centred while it fits, growing up and down from the middle, the way the
        formation does. `min-h-full` with `justify-center` is what allows both:
        centring alone clips the top of a list taller than the screen.
      */}
      <div className="flex min-h-full flex-col justify-center">
        <ul
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
        {players.map((player) => {
          const color = areaColor(player.area);
          const paid = paidPlayerIds?.includes(player.id);

          return (
            <li
              key={player.id}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-2 backdrop-blur-sm"
            >
              <span className="relative shrink-0">
                <PlayerAvatar
                  player={player}
                  className="size-10"
                  style={{
                    outline: `2px solid ${color}`,
                    outlineOffset: "-2px",
                  }}
                />

                {player.id === organizerId ? (
                  <span
                    aria-label="Match organizer"
                    className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Icon icon={CrownIcon} size={9} strokeWidth={2} />
                  </span>
                ) : null}
              </span>

              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium leading-tight">
                  {player.firstName} {player.lastName}
                </span>
                <span
                  className="truncate font-display text-xs uppercase leading-tight tracking-widest"
                  style={{ color }}
                >
                  {getArea(player.area).label}
                </span>
              </span>

              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {paid === undefined ? null : (
                  <PaidMark
                    paid={paid}
                    side={26}
                    onToggle={
                      onTogglePaid && player.id !== organizerId
                        ? () => onTogglePaid(player, !paid)
                        : undefined
                    }
                  />
                )}

                {onRemovePlayer ? (
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(player)}
                    aria-label={`Remove ${player.firstName} from the match`}
                    className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Icon icon={Cancel01Icon} size={14} />
                  </button>
                ) : null}
              </span>
            </li>
          );
          })}
        </ul>
      </div>
    </div>
  );
}
