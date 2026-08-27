"use client";

import {
  Cancel01Icon,
  CrownIcon,
  PaymentSuccess01Icon,
} from "@hugeicons/core-free-icons";
import { memo, useEffect, useRef, useState } from "react";

import { areaColor } from "@/components/players/area-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getArea } from "@/lib/constants";
import { clamp, cn, shortName } from "@/lib/utils";
import type { Player } from "@/types";
import { PaidMark } from "./paid-mark";

/** Matches `.animate-paid-stamp` in globals.css. */
const STAMP_MS = 900;

type PlayerTokenProps = {
  player: Player;
  /** Avatar diameter in px. */
  size: number;
  /** Name plate width in px. */
  plateWidth: number;
  /** Marks the match organizer, who wears the crown. */
  isOrganizer?: boolean;
  /**
   * Whether this player has settled their share of the rental. Undefined hides
   * the mark entirely, which is what an upcoming match wants.
   */
  isPaid?: boolean;
  /** Given only to whoever may settle the rental; the mark is read-only without it. */
  onTogglePaid?: (player: Player, paid: boolean) => void;
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
  isOrganizer,
  isPaid,
  onTogglePaid,
  onRemove,
}: PlayerTokenProps) {
  const color = areaColor(player.area);
  // Low floors so a very large squad shrinks the labels instead of spilling
  // them outside the plate.
  const nameSize = clamp(size * 0.21, 6.5, 18);
  const areaSize = clamp(size * 0.21, 6.5, 14);

  /** The receipt stamped over the photo, cleared once it has played. */
  const [stamping, setStamping] = useState(false);
  const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (stampTimer.current) clearTimeout(stampTimer.current);
    },
    [],
  );

  const canSettle = isPaid !== undefined && !!onTogglePaid;

  const settle = (paid: boolean) => {
    if (!onTogglePaid) return;

    // Only a payment gets the stamp. Undoing one is a correction, not an event.
    if (paid) {
      if (stampTimer.current) clearTimeout(stampTimer.current);
      setStamping(true);
      stampTimer.current = setTimeout(() => setStamping(false), STAMP_MS);
    }

    onTogglePaid(player, paid);
  };

  return (
    <div
      className="group/token relative flex flex-col items-center"
      style={{ width: plateWidth }}
    >
      <div
        className={cn("relative", canSettle && "cursor-pointer")}
        style={{ width: size, height: size }}
        // Double click on the photo is the fast way through a squad: no aiming
        // at a small badge, and a stray single click never moves money.
        onDoubleClick={canSettle ? () => settle(!isPaid) : undefined}
        title={
          canSettle
            ? isPaid
              ? "Double click to undo the payment"
              : "Double click to mark as paid"
            : undefined
        }
      >
        <PlayerAvatar
          player={player}
          className="size-full shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)]"
          style={{
            outline: `${Math.max(1.5, size * 0.03)}px solid ${color}`,
            outlineOffset: `-${Math.max(1.5, size * 0.03)}px`,
          }}
        />

        {stamping ? (
          <span
            aria-hidden
            className="animate-paid-stamp pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-full bg-emerald-500/35 text-white backdrop-blur-[1px]"
          >
            <Icon
              icon={PaymentSuccess01Icon}
              size={Math.max(16, size * 0.55)}
              strokeWidth={2}
            />
          </span>
        ) : null}

        {isOrganizer ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/*
                Focusable on purpose: the crown is the only hint that this
                player runs the match, so it has to reach the keyboard and a
                screen reader too, not just the pointer.
              */}
              <span
                tabIndex={0}
                aria-label="Match organizer"
                className="absolute -top-1 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                style={{ width: size * 0.48, height: size * 0.48 }}
              >
                <Icon
                  icon={CrownIcon}
                  size={Math.max(9, size * 0.28)}
                  strokeWidth={1.5}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">Organizer</TooltipContent>
          </Tooltip>
        ) : null}

        {/*
          Left edge, halfway down the photo. The crown owns the top centre and
          the remove button the top right, and the name plate rides up over the
          bottom of the avatar, so this is the one side left free.
        */}
        {isPaid === undefined ? null : (
          <PaidMark
            paid={isPaid}
            side={Math.max(18, size * 0.36)}
            className="absolute -left-1 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            onToggle={onTogglePaid ? () => settle(!isPaid) : undefined}
          />
        )}

        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(player)}
            aria-label={`Remove ${player.firstName} from the match`}
            className="absolute -right-1 -top-1 z-10 grid cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-lg transition-all hover:border-destructive/60 hover:text-destructive focus-visible:opacity-100 group-hover/token:opacity-100 pointer-coarse:opacity-70"
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
