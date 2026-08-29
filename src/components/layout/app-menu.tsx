"use client";

import {
  Calendar03Icon,
  Location01Icon,
  Login03Icon,
  Logout03Icon,
  ChartLineData01Icon,
  Menu02Icon,
  RefreshIcon,
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
import { api } from "@/lib/api-client";

export type PanelName = "matches" | "players" | "places" | "stats";

const PANELS: Array<{
  name: PanelName;
  label: string;
  hint: string;
  icon: typeof Calendar03Icon;
}> = [
  {
    name: "matches",
    label: "Matches",
    hint: "Dates and lineups",
    icon: Calendar03Icon,
  },
  {
    name: "players",
    label: "Players",
    hint: "Office profiles",
    icon: UserGroupIcon,
  },
  {
    name: "places",
    label: "Places",
    hint: "Pitches you play at",
    icon: Location01Icon,
  },
  {
    name: "stats",
    label: "Stats",
    hint: "Goals, games and records",
    icon: ChartLineData01Icon,
  },
];

export function AppMenu({
  onSelect,
  onSignIn,
}: {
  onSelect: (panel: PanelName) => void;
  onSignIn: () => void;
}) {
  const { isAdmin, authEnabled, demo, logout } = usePichanga();

  const signOut = useAction(async () => logout(), { success: "Signed out" });

  /*
   * Only on the sandbox, and it reaches nothing else: the rows it deletes are
   * the ones marked as the demo's. The page reloads afterwards because every
   * panel on screen is holding a copy of what just stopped existing.
   */
  const reset = useAction(
    async () => {
      await api.resetDemo();
      window.location.reload();
    },
    { success: "Demo rebuilt" },
  );

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
        <DropdownMenuLabel>Browse</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Every panel is readable by anyone; the session gates the edits. */}
        {PANELS.map((panel) => (
          <DropdownMenuItem
            key={panel.name}
            onSelect={() => onSelect(panel.name)}
          >
            <Icon icon={panel.icon} size={17} className="text-primary" />
            <span className="flex flex-col">
              <span className="font-medium">{panel.label}</span>
              <span className="text-xs text-muted-foreground">
                {panel.hint}
              </span>
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {demo ? (
          <DropdownMenuItem
            disabled={reset.pending}
            onSelect={(event) => {
              event.preventDefault();
              void reset.run();
            }}
          >
            <Icon icon={RefreshIcon} size={17} className="text-primary" />
            <span className="flex flex-col">
              <span className="font-medium">Reset the demo</span>
              <span className="text-xs text-muted-foreground">
                Fresh squad, fresh match
              </span>
            </span>
          </DropdownMenuItem>
        ) : null}

        {isAdmin ? (
          <DropdownMenuItem onSelect={() => void signOut.run()}>
            <Icon icon={Logout03Icon} size={17} />
            <span className="font-medium">Sign out</span>
          </DropdownMenuItem>
        ) : (
          <>
            <p className="px-3 py-2 text-sm leading-snug text-foreground/80">
              You can manage players and the lineup. Changing matches and places
              needs the password.
            </p>

            {authEnabled ? (
              <DropdownMenuItem onSelect={onSignIn}>
                <Icon icon={Login03Icon} size={17} className="text-primary" />
                <span className="font-medium">Sign in</span>
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
