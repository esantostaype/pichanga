"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMemo, useRef } from "react";

import { TeamCrest } from "@/components/matches/team-crest";
import { POSITIONS } from "@/lib/constants";
import { EASE } from "@/lib/ease";
import { buildFormation, buildTeamFormation } from "@/lib/formation";
import type { MatchTeam, Player } from "@/types";
import { PlayerToken } from "./player-token";

gsap.registerPlugin(useGSAP);

/** Room kept at the top of a team's band for its crest and its name. */
const BAND_HEADER = 58;

type LineupLayerProps = {
  players: Player[];
  width: number;
  height: number;
  /** Space reserved top and bottom so the HUD never covers a token. */
  insetY?: number;
  /** Their token takes the centre slot and wears the crown. */
  organizerId?: string | null;
  /**
   * The drawn sides. With them the pitch stops being one lineup and becomes a
   * band per team; without them nothing here changes.
   */
  teams?: MatchTeam[];
  /** Ids that already paid. Undefined leaves the payment mark off. */
  paidPlayerIds?: string[];
  onTogglePaid?: (player: Player, paid: boolean) => void;
  onViewPlayer?: (player: Player) => void;
  onRemovePlayer?: (player: Player) => void;
  /** Hands one side's gloves to somebody else. Absent leaves them alone. */
  onSetKeeper?: (teamId: string, playerId: string) => void;
  /** Whose gloves are on their way from the server. */
  keeperPending?: string | null;
};

/**
 * Places the tokens on the pitch and animates every change: new players are
 * born in the center circle and travel to their spot while the rest shuffle to
 * keep the formation symmetric.
 *
 * Drawing the teams is just another change of slots, which is why the sides
 * sort themselves out in front of you instead of appearing already sorted: the
 * tokens are the same nodes, and the tween that carries a new player to their
 * place carries everybody to their team.
 */
export function LineupLayer({
  players,
  width,
  height,
  insetY = 0,
  organizerId,
  teams,
  paidPlayerIds,
  onTogglePaid,
  onViewPlayer,
  onRemovePlayer,
  onSetKeeper,
  keeperPending,
}: LineupLayerProps) {
  const scope = useRef<HTMLDivElement>(null);
  /** Ids already animated: tells "first entrance" apart from "reposition". */
  const placed = useRef(new Set<string>());

  const drawn = useMemo(
    () => (teams ?? []).filter((team) => team.playerIds.length > 0),
    [teams],
  );

  // One side is not sides: it would be a band down the middle of the pitch.
  const grouped = drawn.length > 1;

  const ordered = useMemo(() => {
    if (grouped) {
      const byId = new Map(players.map((player) => [player.id, player]));

      return drawn.flatMap((team) =>
        team.playerIds
          .map((id) => byId.get(id))
          .filter((player) => player !== undefined)
          // Back to front inside the band: the keeper, then the defenders, and
          // so on. It is the order a team sheet is read in.
          .sort(
            (left, right) =>
              rank(left, team) - rank(right, team) ||
              left.lastName.localeCompare(right.lastName),
          ),
      );
    }

    if (!organizerId) return players;

    const organizer = players.find((player) => player.id === organizerId);
    if (!organizer) return players;

    return [
      organizer,
      ...players.filter((player) => player.id !== organizerId),
    ];
  }, [players, organizerId, drawn, grouped]);

  const layout = useMemo(() => {
    if (grouped) {
      const formation = buildTeamFormation(
        drawn.map((team) => team.playerIds.length),
        width,
        height,
        insetY,
        BAND_HEADER,
      );

      return {
        slots: formation.bands.flatMap((band) => band.slots),
        tokenSize: formation.tokenSize,
        plateWidth: formation.plateWidth,
        bands: formation.bands,
      };
    }

    const formation = buildFormation(
      players.length,
      width,
      height,
      insetY,
      !!organizerId,
    );

    return {
      slots: formation.slots,
      tokenSize: formation.tokenSize,
      plateWidth: formation.plateWidth,
      bands: [],
    };
  }, [players.length, width, height, insetY, organizerId, drawn, grouped]);

  /** Which side each player is on, for the ring around their photo. */
  const accents = useMemo(
    () =>
      new Map(
        drawn.flatMap((team) =>
          team.playerIds.map((id) => [id, team.accent] as const),
        ),
      ),
    [drawn],
  );

  // The array identity changes on every refresh; only the order matters.
  const signature = ordered.map((player) => player.id).join(",");

  useGSAP(
    () => {
      const root = scope.current;
      if (!root || !layout.slots.length) return;

      const cx = width / 2;
      const cy = height / 2;
      const alive = new Set<string>();

      ordered.forEach((player, index) => {
        const node = root.querySelector<HTMLElement>(
          `[data-token="${player.id}"]`,
        );
        const slot = layout.slots[index];
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
    { dependencies: [layout, signature], scope },
  );

  /* Who has the gloves, and how to hand them to somebody else. */
  const keeperOf = new Map(
    drawn.flatMap((team) =>
      team.playerIds.map((id) => [id, id === team.keeperId] as const),
    ),
  );

  const teamOf = new Map(
    drawn.flatMap((team) => team.playerIds.map((id) => [id, team.id] as const)),
  );

  const makeKeeper = (playerId: string) => {
    const teamId = teamOf.get(playerId);
    if (!onSetKeeper || !teamId) return undefined;
    return () => onSetKeeper(teamId, playerId);
  };

  return (
    <div ref={scope} className="absolute inset-0">
      {/* One crest per band, at the head of the side it belongs to. */}
      {layout.bands.map((band, index) => {
        const team = drawn[index];
        if (!team) return null;

        return (
          <div
            key={team.id}
            className="pointer-events-none absolute flex flex-col items-center gap-1"
            style={{
              left: band.x,
              top: band.y + insetY + 8,
              width: band.width,
            }}
          >
            <TeamCrest name={team.name} accent={team.accent} size={30} />
            <span
              className="max-w-full truncate px-2 font-display text-lg uppercase tracking-[0.04em]"
              style={{ color: team.accent }}
            >
              {team.name}
            </span>
          </div>
        );
      })}

      {ordered.map((player) => (
        <div
          key={player.id}
          data-token={player.id}
          className="invisible absolute left-0 top-0 will-change-transform"
        >
          <div className="-translate-x-1/2 -translate-y-1/2">
            <PlayerToken
              player={player}
              size={layout.tokenSize}
              plateWidth={layout.plateWidth}
              isOrganizer={player.id === organizerId}
              accent={accents.get(player.id)}
              isPaid={
                paidPlayerIds ? paidPlayerIds.includes(player.id) : undefined
              }
              // The organizer's mark is locked: their share is settled by
              // definition, so there is nothing to toggle.
              onTogglePaid={
                paidPlayerIds && player.id !== organizerId
                  ? onTogglePaid
                  : undefined
              }
              onView={onViewPlayer}
              onRemove={onRemovePlayer}
              isKeeper={keeperOf.get(player.id) === true}
              onMakeKeeper={makeKeeper(player.id)}
              keeperPending={keeperPending === player.id}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Keeper first, then back to front, so a band reads like a team sheet. */
function rank(player: Player, team: MatchTeam) {
  if (player.id === team.keeperId) return -1;
  return POSITIONS.findIndex((position) => position.id === player.position);
}
