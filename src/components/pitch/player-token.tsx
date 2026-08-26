"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { memo } from "react";

import { areaColor } from "@/components/players/area-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Icon } from "@/components/ui/icon";
import { getArea } from "@/lib/constants";
import { clamp, shortName } from "@/lib/utils";
import type { Player } from "@/types";

type PlayerTokenProps = {
  player: Player;
  /** Avatar diameter in px. */
  size: number;
  /** Name plate width in px. */
  plateWidth: number;
  onRemove?: (player: Player) => void;
};

/**
 * Pitch token: circular photo above a plate with the name and the area.
 * Every measurement derives from `size` so it scales with the device and with
 * how many players are on the pitch.
 */
function PlayerTokenBase({
  player,
  size,
  plateWidth,
  onRemove,
}: PlayerTokenProps) {
  const color = areaColor(player.area);
  // Low floors so a very large squad shrinks the labels instead of spilling
  // them outside the plate.
  const nameSize = clamp(size * 0.21, 6.5, 18);
  const areaSize = clamp(size * 0.21, 6.5, 14);

  return (
    <div
      className="group/token relative flex flex-col items-center"
      style={{ width: plateWidth }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <PlayerAvatar
          player={player}
          className="size-full shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)]"
          style={{
            outline: `${Math.max(1.5, size * 0.03)}px solid ${color}`,
            outlineOffset: `-${Math.max(1.5, size * 0.03)}px`,
          }}
        />

        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(player)}
            aria-label={`Remove ${player.firstName} from the match`}
            className="absolute -right-1 -top-1 grid place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-lg transition-all hover:border-destructive/60 hover:text-destructive focus-visible:opacity-100 group-hover/token:opacity-100 pointer-coarse:opacity-70"
            style={{ width: size * 0.34, height: size * 0.34 }}
          >
            <Icon icon={Cancel01Icon} size={Math.max(8, size * 0.18)} />
          </button>
        ) : null}
      </div>

      <div
        className="relative w-full rounded-md border border-white/10 bg-black/55 px-2 py-3 text-center backdrop-blur-sm"
        style={{ marginTop: -size * 0.1 }}
      >
        <p
          className="truncate font-display uppercase leading-none tracking-widest text-foreground"
          style={{ fontSize: nameSize }}
          title={`${player.firstName} ${player.lastName}`}
        >
          {shortName(player.firstName, player.lastName)}
        </p>
        <p
          className="truncate font-display uppercase leading-none tracking-widest text-foreground mt-1"
          style={{ fontSize: areaSize, color }}
        >
          {getArea(player.area).label}
        </p>
      </div>
    </div>
  );
}

export const PlayerToken = memo(PlayerTokenBase);
