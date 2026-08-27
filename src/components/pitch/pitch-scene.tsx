"use client";

import { FootballPitchIcon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";
import { useElementSize } from "@/hooks/use-element-size";
import type { Match, Player } from "@/types";
import { LineupLayer } from "./lineup-layer";
import { LineupList } from "./lineup-list";
import { PitchSurface } from "./pitch-surface";

/**
 * Narrower than this and the tokens' name plates fall to seven or eight
 * pixels, so the lineup is listed over the pitch instead of placed on it.
 */
const LIST_BELOW = 768;

/** And at 479 or under, two columns of photo-and-name stop fitting. */
const ONE_COLUMN_BELOW = 480;

type PitchSceneProps = {
  match: Match | null;
  /** Height of the floating HUD, kept clear at the top and bottom. */
  hudInset?: number;
  /**
   * What the list keeps clear at the bottom, which is only the floating add
   * button -- nothing like the HUD is down there.
   */
  bottomInset?: number;
  onRemovePlayer?: (player: Player) => void;
  /** Passed only when this visitor may settle the rental. */
  onTogglePaid?: (player: Player, paid: boolean) => void;
};

/** The pitch fills 100% of the screen; everything else sits on top of it. */
export function PitchScene({
  match,
  hudInset = 0,
  bottomInset = 0,
  onRemovePlayer,
  onTogglePaid,
}: PitchSceneProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const players = match?.players ?? [];

  /**
   * Always on. The rental is usually collected after the whistle, but plenty of
   * people pay up front, so the ledger has to be open on every match -- past,
   * present and still to come.
   */
  const showPayments = !!match;

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden bg-(--grass-edge)"
    >
      <PitchSurface width={size.width} height={size.height} />

      {players.length > 0 && size.width > 0 && size.width < LIST_BELOW ? (
        <LineupList
          players={players}
          paidPlayerIds={showPayments ? match.paidPlayerIds : undefined}
          organizerId={match?.organizerId}
          columns={size.width < ONE_COLUMN_BELOW ? 1 : 2}
          insetTop={hudInset}
          insetBottom={bottomInset}
          onRemovePlayer={onRemovePlayer}
          onTogglePaid={onTogglePaid}
        />
      ) : players.length > 0 ? (
        <LineupLayer
          players={players}
          width={size.width}
          height={size.height}
          insetY={hudInset}
          organizerId={match?.organizerId}
          paidPlayerIds={showPayments ? match.paidPlayerIds : undefined}
          onTogglePaid={onTogglePaid}
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
