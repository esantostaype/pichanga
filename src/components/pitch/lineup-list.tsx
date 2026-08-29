"use client";

import { Cancel01Icon, CrownIcon } from "@hugeicons/core-free-icons";

import { TeamCrest } from "@/components/matches/team-crest";
import { areaColor } from "@/components/players/area-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Icon } from "@/components/ui/icon";
import { getArea } from "@/lib/constants";
import type { MatchTeam, Player } from "@/types";
import { PaidMark } from "./paid-mark";

/**
 * The lineup as a list, over the pitch rather than on it.
 *
 * On a phone the formation still places twenty-four tokens comfortably -- they
 * come out around 40px -- but the name plate under each one is a fifth of that,
 * seven or eight pixels, which nobody can read. So the pitch stays as the
 * backdrop it always was and the players line up over it, photo on the left and
 * name on the right, the same shape as the share card.
 *
 * Once the sides are drawn the same list breaks into one section per team. A
 * phone has no room for bands side by side, so the teams take turns down the
 * screen instead of across it.
 */
export function LineupList({
  players,
  paidPlayerIds,
  organizerId,
  teams,
  columns,
  insetTop,
  insetBottom,
  onRemovePlayer,
  onTogglePaid,
  onViewPlayer,
}: {
  players: Player[];
  /** Undefined leaves the payment marks off, as on the pitch. */
  paidPlayerIds?: string[];
  organizerId?: string | null;
  teams?: MatchTeam[];
  columns: 1 | 2;
  insetTop: number;
  insetBottom: number;
  onRemovePlayer?: (player: Player) => void;
  onTogglePaid?: (player: Player, paid: boolean) => void;
  onViewPlayer?: (player: Player) => void;
}) {
  const drawn = (teams ?? []).filter((team) => team.playerIds.length > 0);
  const byId = new Map(players.map((player) => [player.id, player]));
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  const row = (player: Player, accent?: string) => (
    <Row
      key={player.id}
      player={player}
      accent={accent}
      isOrganizer={player.id === organizerId}
      paid={paidPlayerIds?.includes(player.id)}
      onTogglePaid={
        onTogglePaid && player.id !== organizerId ? onTogglePaid : undefined
      }
      onView={onViewPlayer}
      onRemove={onRemovePlayer}
    />
  );

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
      <div className="flex min-h-full flex-col justify-center gap-4">
        {drawn.length > 1 ? (
          drawn.map((team) => (
            <section key={team.id}>
              <header className="mb-2 flex items-center gap-2">
                <TeamCrest name={team.name} accent={team.accent} size={22} />
                <span
                  className="min-w-0 truncate font-display text-sm uppercase tracking-[0.08em]"
                  style={{ color: team.accent }}
                >
                  {team.name}
                </span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                  {team.playerIds.length}
                </span>
              </header>

              <ul className="grid gap-2" style={grid}>
                {team.playerIds
                  .map((id) => byId.get(id))
                  .filter((player) => player !== undefined)
                  .map((player) => row(player, team.accent))}
              </ul>
            </section>
          ))
        ) : (
          <ul className="grid gap-2" style={grid}>
            {players.map((player) => row(player))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({
  player,
  accent,
  isOrganizer,
  paid,
  onTogglePaid,
  onView,
  onRemove,
}: {
  player: Player;
  /** The side they are on. It takes the ring, the way it does on the pitch. */
  accent?: string;
  isOrganizer: boolean;
  paid?: boolean;
  onTogglePaid?: (player: Player, paid: boolean) => void;
  onView?: (player: Player) => void;
  onRemove?: (player: Player) => void;
}) {
  const area = areaColor(player.area);
  const ring = accent ?? area;

  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-2 backdrop-blur-sm">
      <span className="relative shrink-0">
        <PlayerAvatar
          player={player}
          className="size-10"
          style={{
            outline: `2px solid ${ring}`,
            outlineOffset: "-2px",
          }}
        />

        {isOrganizer ? (
          <span
            aria-label="Match organizer"
            className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Icon icon={CrownIcon} size={9} strokeWidth={2} />
          </span>
        ) : null}
      </span>

      <button
        type="button"
        onClick={onView ? () => onView(player) : undefined}
        disabled={!onView}
        aria-label={`View ${player.firstName}'s card`}
        className="flex min-w-0 flex-1 flex-col text-left disabled:cursor-default enabled:cursor-pointer"
      >
        <span className="truncate text-sm font-medium leading-tight">
          {player.firstName} {player.lastName}
        </span>
        <span
          className="truncate font-display text-xs uppercase leading-tight tracking-widest"
          style={{ color: area }}
        >
          {getArea(player.area).label}
        </span>
      </button>

      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        {paid === undefined ? null : (
          <PaidMark
            paid={paid}
            side={26}
            onToggle={onTogglePaid ? () => onTogglePaid(player, !paid) : undefined}
          />
        )}

        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(player)}
            aria-label={`Remove ${player.firstName} from the match`}
            className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        ) : null}
      </span>
    </li>
  );
}
