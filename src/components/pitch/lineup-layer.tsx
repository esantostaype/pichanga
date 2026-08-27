"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMemo, useRef } from "react";

import { EASE } from "@/lib/ease";
import { buildFormation } from "@/lib/formation";
import type { Player } from "@/types";
import { PlayerToken } from "./player-token";

gsap.registerPlugin(useGSAP);

type LineupLayerProps = {
  players: Player[];
  width: number;
  height: number;
  /** Space reserved top and bottom so the HUD never covers a token. */
  insetY?: number;
  /** Their token takes the centre slot and wears the crown. */
  organizerId?: string | null;
  onRemovePlayer?: (player: Player) => void;
};

/**
 * Places the tokens on the pitch and animates every change: new players are
 * born in the center circle and travel to their spot while the rest shuffle to
 * keep the formation symmetric.
 */
export function LineupLayer({
  players,
  width,
  height,
  insetY = 0,
  organizerId,
  onRemovePlayer,
}: LineupLayerProps) {
  const scope = useRef<HTMLDivElement>(null);
  /** Ids already animated: tells "first entrance" apart from "reposition". */
  const placed = useRef(new Set<string>());

  // The organizer goes first, because slot 0 is the centre of the pitch.
  const ordered = useMemo(() => {
    if (!organizerId) return players;
    const organizer = players.find((player) => player.id === organizerId);
    if (!organizer) return players;
    return [organizer, ...players.filter((player) => player.id !== organizerId)];
  }, [players, organizerId]);

  const formation = useMemo(
    () => buildFormation(ordered.length, width, height, insetY, !!organizerId),
    [ordered.length, width, height, insetY, organizerId],
  );

  // The array identity changes on every refresh; only the order matters.
  const signature = ordered.map((player) => player.id).join(",");

  useGSAP(
    () => {
      const root = scope.current;
      if (!root || !formation.slots.length) return;

      const cx = width / 2;
      const cy = height / 2;
      const alive = new Set<string>();

      ordered.forEach((player, index) => {
        const node = root.querySelector<HTMLElement>(
          `[data-token="${player.id}"]`,
        );
        const slot = formation.slots[index];
        if (!node || !slot) return;

        alive.add(player.id);

        // `overwrite: true` kills every tween on the node, not just the ones
        // touching the same properties. Without it a layout change landing
        // mid-entrance leaves two tweens interleaved and the token settles on
        // a hybrid position (x from one slot, y from another).
        //
        // Because of that, this tween has to describe the *whole* resting
        // state, not just the position: if it interrupts an entrance it also
        // inherits the job of finishing it. Animating only x/y left the token
        // stuck at `autoAlpha: 0, scale: 0.3` — invisible for good.
        if (placed.current.has(player.id)) {
          gsap.to(node, {
            x: slot.x,
            y: slot.y,
            scale: 1,
            autoAlpha: 1,
            duration: 0.6,
            ease: EASE,
            overwrite: true,
          });
          return;
        }

        gsap.fromTo(
          node,
          { x: cx, y: cy, scale: 0.3, autoAlpha: 0 },
          {
            x: slot.x,
            y: slot.y,
            scale: 1,
            autoAlpha: 1,
            duration: 0.85,
            ease: EASE,
            delay: Math.min(index * 0.045, 0.6),
            overwrite: true,
          },
        );
      });

      placed.current = alive;
    },
    { dependencies: [formation, signature], scope },
  );

  return (
    <div ref={scope} className="absolute inset-0">
      {ordered.map((player) => (
        <div
          key={player.id}
          data-token={player.id}
          className="invisible absolute left-0 top-0 will-change-transform"
        >
          <div className="-translate-x-1/2 -translate-y-1/2">
            <PlayerToken
              player={player}
              size={formation.tokenSize}
              plateWidth={formation.plateWidth}
              isOrganizer={player.id === organizerId}
              onRemove={onRemovePlayer}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
