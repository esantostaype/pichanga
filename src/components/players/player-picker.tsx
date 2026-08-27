"use client";

import {
  Search01Icon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { getArea } from "@/lib/constants";
import { cn, normalize } from "@/lib/utils";
import type { Player } from "@/types";
import { AreaBadge } from "./area-badge";
import { PlayerAvatar } from "./player-avatar";

type PlayerPickerProps = {
  players: Player[];
  selected: string[];
  onToggle: (playerId: string) => void;
  /** Players already signed up: shown ticked and impossible to untick. */
  lockedIds?: string[];
  className?: string;
};

/** Searchable multi-select list, shared by both dialogs. */
export function PlayerPicker({
  players,
  selected,
  onToggle,
  lockedIds = [],
  className,
}: PlayerPickerProps) {
  const [query, setQuery] = useState("");

  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);
  const chosen = useMemo(() => new Set(selected), [selected]);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return players;

    return players.filter((player) =>
      normalize(
        `${player.firstName} ${player.lastName} ${getArea(player.area).label}`,
      ).includes(needle),
    );
  }, [players, query]);

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Icon icon={Search01Icon} size={16} />
        </span>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or area..."
          className="pl-9"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {results.length === 0 ? (
          <EmptyState
            icon={UserGroupIcon}
            title="No results"
            description={
              players.length
                ? "Try another name."
                : "No players have been created yet."
            }
            className="py-10"
          />
        ) : (
          <ul className="space-y-1.5 pr-1">
            {results.map((player) => {
              const isLocked = locked.has(player.id);
              const isChecked = isLocked || chosen.has(player.id);

              return (
                <li key={player.id}>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => onToggle(player.id)}
                    aria-pressed={isChecked}
                    className={cn(
                      "cursor-pointer flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      isChecked
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/60 bg-muted/25 hover:bg-accent/60",
                      isLocked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <PlayerAvatar player={player} className="size-9" />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {player.firstName} {player.lastName}
                      </span>
                      <span className="mt-0.5 block">
                        <AreaBadge area={player.area} />
                      </span>
                    </span>

                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                        isChecked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {isChecked ? <Icon icon={Tick02Icon} size={12} /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
