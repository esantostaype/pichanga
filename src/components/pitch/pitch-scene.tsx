"use client";

import { FootballPitchIcon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
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
  /** Opens a player's card. Everyone gets this one. */
  onViewPlayer?: (player: Player) => void;
  /** Hands one side's gloves to somebody else. */
  onSetKeeper?: (teamId: string, playerId: string) => void;
  /** Whose gloves are on their way from the server. */
  keeperPending?: string | null;
  /** Played out: the sides come off the pitch and the ledger comes back. */
  over?: boolean;
};

/** The pitch fills 100% of the screen; everything else sits on top of it. */
export function PitchScene({
  match,
  hudInset = 0,
  bottomInset = 0,
  onRemovePlayer,
  onViewPlayer,
  onSetKeeper,
  keeperPending,
  over = false,
}: PitchSceneProps) {
  const { t } = useLocale();
  const [ref, size] = useElementSize<HTMLDivElement>();
  const players = match?.players ?? [];

  /*
   * Once the sides are drawn the pitch is about the match, not the money: the
   * paid marks and the organizer's crown come off. They are both still a tap
   * away in the ledger, and neither of them means anything while a game is on.
   */
  const drawn = !over && (match?.teams.length ?? 0) > 1;

  /*
   * And once it has been played out the bands come off altogether. The sides
   * are still on the row -- the season's table is built from them -- but this
   * screen is back to being the notice it was before they were drawn: who
   * played, and who has settled up.
   */
  const teams = over ? undefined : match?.teams;

  /*
   * No paid marks on the pitch. Every payment -- the pitch, the penalties, the
   * pot -- is settled together from the night's accounts once it is over, so
   * the tokens carry who is playing and who runs it, and nothing about money.
   */

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden bg-(--grass-edge)"
    >
      <PitchSurface width={size.width} height={size.height} />

      {players.length > 0 && size.width > 0 && size.width < LIST_BELOW ? (
        <LineupList
          players={players}
          organizerId={drawn ? null : match?.organizerId}
          teams={teams}
          columns={size.width < ONE_COLUMN_BELOW ? 1 : 2}
          insetTop={hudInset}
          insetBottom={bottomInset}
          onRemovePlayer={onRemovePlayer}
          onViewPlayer={onViewPlayer}
          onSetKeeper={over ? undefined : onSetKeeper}
          keeperPending={keeperPending}
        />
      ) : players.length > 0 ? (
        <LineupLayer
          players={players}
          width={size.width}
          height={size.height}
          insetY={hudInset}
          organizerId={drawn ? null : match?.organizerId}
          teams={teams}
          onViewPlayer={onViewPlayer}
          onRemovePlayer={onRemovePlayer}
          onSetKeeper={over ? undefined : onSetKeeper}
          keeperPending={keeperPending}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-full border border-white/10 bg-black/40 text-muted-foreground backdrop-blur-sm">
              <Icon icon={FootballPitchIcon} size={24} />
            </span>
            <p className="font-display text-lg uppercase tracking-[0.2em] text-white">
              {match ? t.pitch.emptyTitle : t.pitch.noMatchTitle}
            </p>
            <p className="whitespace-nowrap text-md text-muted-foreground">
              {match ? t.pitch.emptyLine : t.pitch.noMatchLine}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
