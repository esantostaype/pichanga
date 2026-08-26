"use client";

import { FootballPitchIcon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";
import { useElementSize } from "@/hooks/use-element-size";
import type { Match, Player } from "@/types";
import { LineupLayer } from "./lineup-layer";
import { PitchSurface } from "./pitch-surface";

type PitchSceneProps = {
  match: Match | null;
  /** Height of the floating HUD, kept clear at the top and bottom. */
  hudInset?: number;
  onRemovePlayer?: (player: Player) => void;
};

/** The pitch fills 100% of the screen; everything else sits on top of it. */
export function PitchScene({
  match,
  hudInset = 0,
  onRemovePlayer,
}: PitchSceneProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const players = match?.players ?? [];

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden bg-(--grass-edge)"
    >
      <PitchSurface width={size.width} height={size.height} />

      {players.length > 0 ? (
        <LineupLayer
          players={players}
          width={size.width}
          height={size.height}
          insetY={hudInset}
          onRemovePlayer={onRemovePlayer}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-full border border-white/10 bg-black/40 text-muted-foreground backdrop-blur-sm">
              <Icon icon={FootballPitchIcon} size={24} />
            </span>
            <p className="font-display text-lg uppercase tracking-[0.2em] text-white">
              {match ? "Empty pitch" : "No matches yet"}
            </p>
            <p className="whitespace-nowrap text-md text-muted-foreground">
              {match
                ? "Add players and they line up from the center."
                : "Create a match from the menu to build the lineup."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
