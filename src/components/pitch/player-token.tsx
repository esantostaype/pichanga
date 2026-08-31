"use client";

import {
  Cancel01Icon,
  CrownIcon,
  GloveIcon,
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
import { useLocale } from "@/components/providers/locale-provider";
import { areaLabel, fill } from "@/i18n/dictionaries";
import { clamp, cn, shortName } from "@/lib/utils";
import type { Player } from "@/types";
import { Spinner } from "@/components/ui/spinner";
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
   * The colour of the side they were drawn into. Given, it replaces the area
   * colour around the photo: once the teams exist, which team somebody is on
   * matters more than which floor they sit on.
   */
  accent?: string;
  /**
   * Whether this player has settled their share of the rental. Undefined hides
   * the mark entirely, which is what an upcoming match wants.
   */
  isPaid?: boolean;
  /** Given only to whoever may settle the rental; the mark is read-only without it. */
  onTogglePaid?: (player: Player, paid: boolean) => void;
  /** Opens their card. The name plate is what carries it. */
  onView?: (player: Player) => void;
  onRemove?: (player: Player) => void;
  /** They are the one in goal for their side. */
  isKeeper?: boolean;
  /** Hands them the gloves. Absent when there is nothing to hand over. */
  onMakeKeeper?: () => void;
  /** Their gloves are on their way from the server. */
  keeperPending?: boolean;
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
  accent,
  isPaid,
  onTogglePaid,
  onView,
  onRemove,
  isKeeper,
  onMakeKeeper,
  keeperPending,
}: PlayerTokenProps) {
  const { t } = useLocale();
  const color = accent ?? areaColor(player.area);
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
      {/*
        The photo opens their card, the same as the name under it -- it is the
        biggest thing on the token and the first thing anybody aims at. It is
        no longer the payment target: a gesture that moves money sharing a
        target with one that reads about somebody eventually fires by mistake,
        so settling up is the mark on the edge and nothing else.
      */}
      <div className="relative" style={{ width: size, height: size }}>
        <PlayerAvatar
          player={player}
          className="size-full shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)]"
          style={{
            outline: `${Math.max(1.5, size * 0.03)}px solid ${color}`,
            outlineOffset: `-${Math.max(1.5, size * 0.03)}px`,
          }}
        />

        {onView ? (
          /*
           * A sheet over the photo rather than a button around it: the mark and
           * the remove control sit inside this box at `z-10`, and a button
           * cannot contain other buttons. Hidden from the keyboard and from a
           * screen reader on purpose -- the name plate below carries the same
           * action, and one player should be one stop, not two.
           */
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => onView(player)}
            title={fill(t.pitch.viewCard, { name: player.firstName })}
            className="absolute inset-0 cursor-pointer rounded-full"
          />
        ) : null}

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
                aria-label={t.pitch.organizer}
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
            <TooltipContent side="top">{t.pitch.organizerShort}</TooltipContent>
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

        {/*
          Once the sides are drawn the ledger comes off the pitch, which leaves
          that same edge free for the one thing that matters while a game is
          on: who is in goal.
        */}
        {isKeeper ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                aria-label={t.pitch.inGoal}
                className="absolute -left-1 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                style={{
                  width: Math.max(18, size * 0.36),
                  height: Math.max(18, size * 0.36),
                  color,
                  borderColor: `${color}66`,
                  // Mixed rather than faded: over grass, a translucent badge
                  // takes the pitch markings through it.
                  backgroundColor: `color-mix(in oklab, ${color} 22%, var(--background))`,
                }}
              >
                <Icon
                  icon={GloveIcon}
                  size={Math.max(9, size * 0.2)}
                  strokeWidth={2}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">{t.pitch.inGoal}</TooltipContent>
          </Tooltip>
        ) : null}

        {onRemove ? (
          /*
           * The circle is small and it sits on the corner, half off the token
           * -- which made it a thing you had to travel to and could lose on the
           * way, because leaving the token takes the hover with it. The square
           * before it is invisible and eight pixels bigger on every side: it
           * catches the clicks that land just wide, and because it belongs to a
           * child of the token it also keeps the token hovered while the
           * pointer crosses the gap.
           */
          <button
            type="button"
            onClick={() => onRemove(player)}
            aria-label={fill(t.pitch.removeFromMatch, {
              name: player.firstName,
            })}
            className="absolute -right-1 -top-1 z-10 grid cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-lg transition-all before:absolute before:-inset-2 before:content-[''] hover:border-destructive/60 hover:text-destructive focus-visible:opacity-100 group-hover/token:opacity-100 pointer-coarse:opacity-70"
            style={{ width: size * 0.34, height: size * 0.34 }}
          >
            <Icon icon={Cancel01Icon} size={Math.max(8, size * 0.18)} />
          </button>
        ) : null}
      </div>

      <div className="relative w-full" style={{ marginTop: -size * 0.1 }}>
        {onMakeKeeper && !isKeeper ? (
          /*
            Half off the corner of the plate, the way the remove button sits on
            the corner of the photo, and with the same invisible square around
            it because it is the same small circle to aim at. Its own button
            rather than something inside the plate: the plate is already one,
            and a button cannot hold another.
          */
          <button
            type="button"
            onClick={onMakeKeeper}
            disabled={keeperPending}
            aria-label={fill(t.pitch.putInGoal, { name: player.firstName })}
            title={fill(t.pitch.putInGoal, { name: player.firstName })}
            className={cn(
              "absolute -right-1.5 -top-1.5 z-20 grid cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-all before:absolute before:-inset-2 before:content-[''] hover:text-foreground focus-visible:opacity-100 group-hover/token:opacity-100 disabled:cursor-default pointer-coarse:opacity-70",
              // Quiet until the token is reached for -- unless the gloves are
              // already on their way, in which case taking the mouse away must
              // not take the answer with it.
              keeperPending ? "opacity-100" : "opacity-0",
            )}
            style={{
              width: Math.max(18, size * 0.34),
              height: Math.max(18, size * 0.34),
            }}
          >
            {keeperPending ? (
              <Spinner size={Math.max(9, size * 0.19)} />
            ) : (
              <Icon icon={GloveIcon} size={Math.max(9, size * 0.19)} />
            )}
          </button>
        ) : null}

        <Plate
          onView={onView ? () => onView(player) : undefined}
          label={fill(t.pitch.viewCard, { name: player.firstName })}
        >
          <p
            className="truncate font-display uppercase leading-none tracking-widest text-foreground"
            style={{ fontSize: nameSize }}
            title={`${player.firstName} ${player.lastName}`}
          >
            {shortName(player.firstName, player.lastName)}
          </p>
          <p
            className="mt-1 truncate font-display uppercase leading-none tracking-widest text-foreground"
            style={{ fontSize: areaSize, color }}
          >
            {areaLabel(t, player.area)}
          </p>
        </Plate>
      </div>
    </div>
  );
}

/**
 * The name plate: a button when there is a card to open, a plain box when
 * there is not. Same shape either way, so the pitch does not change when a
 * screen happens not to pass the handler.
 */
function Plate({
  onView,
  label,
  style,
  children,
}: {
  onView?: () => void;
  label: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const className =
    "relative w-full rounded-md border border-white/10 bg-black/55 px-2 py-3 text-center backdrop-blur-sm";

  if (!onView) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onView}
      aria-label={label}
      title={label}
      style={style}
      className={cn(
        className,
        "cursor-pointer transition-colors hover:border-white/25 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
    >
      {children}
    </button>
  );
}

export const PlayerToken = memo(PlayerTokenBase);
