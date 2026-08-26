"use client";

import {
  Calendar03Icon,
  Menu02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";

export type PanelName = "matches" | "players";

export function AppMenu({ onSelect }: { onSelect: (panel: PanelName) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Open menu"
          className="bg-black/55 backdrop-blur-md"
        >
          <Icon icon={Menu02Icon} size={20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Manage</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => onSelect("matches")}>
          <Icon icon={Calendar03Icon} size={17} className="text-primary" />
          <span className="flex flex-col">
            <span className="font-medium">Matches</span>
            <span className="text-xs text-muted-foreground">
              Dates and lineups
            </span>
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => onSelect("players")}>
          <Icon icon={UserGroupIcon} size={17} className="text-primary" />
          <span className="flex flex-col">
            <span className="font-medium">Players</span>
            <span className="text-xs text-muted-foreground">
              Office profiles
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
