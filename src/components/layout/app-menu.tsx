"use client";

import {
  Calendar03Icon,
  Location01Icon,
  Login03Icon,
  Logout03Icon,
  Menu02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { usePichanga } from "@/components/providers/pichanga-provider";
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
import { useAction } from "@/hooks/use-action";

export type PanelName = "matches" | "players" | "places";

export function AppMenu({
  onSelect,
  onSignIn,
}: {
  onSelect: (panel: PanelName) => void;
  onSignIn: () => void;
}) {
  const { isAdmin, authEnabled, logout } = usePichanga();

  const signOut = useAction(async () => logout(), { success: "Signed out" });

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
        {isAdmin ? (
          <>
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

            <DropdownMenuItem onSelect={() => onSelect("places")}>
              <Icon icon={Location01Icon} size={17} className="text-primary" />
              <span className="flex flex-col">
                <span className="font-medium">Places</span>
                <span className="text-xs text-muted-foreground">
                  Pitches you play at
                </span>
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => void signOut.run()}>
              <Icon icon={Logout03Icon} size={17} />
              <span className="font-medium">Sign out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Guest</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/*
              A plain paragraph, not a menu item: it is not selectable, and as
              a disabled item it would also inherit `opacity-50` on top of the
              muted colour, which made it nearly unreadable.
            */}
            <p className="px-3 py-2 text-sm leading-snug text-foreground/80">
              You can add players to the match. Managing matches, players and
              places needs the password.
            </p>

            {authEnabled ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onSignIn}>
                  <Icon icon={Login03Icon} size={17} className="text-primary" />
                  <span className="font-medium">Sign in</span>
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
