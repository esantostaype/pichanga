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

import { LanguageSwitch } from "@/components/layout/language-switch";
import { useLocale } from "@/components/providers/locale-provider";
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

const PANELS: Array<{ name: PanelName; icon: typeof Calendar03Icon }> = [
  { name: "matches", icon: Calendar03Icon },
  { name: "players", icon: UserGroupIcon },
  { name: "places", icon: Location01Icon },
  { name: "stats", icon: ChartLineData01Icon },
];

export function AppMenu({
  onSelect,
  onSignIn,
}: {
  onSelect: (panel: PanelName) => void;
  onSignIn: () => void;
}) {
  const { isAdmin, authEnabled, demo, logout } = usePichanga();
  const { t } = useLocale();

  const signOut = useAction(async () => logout(), {
    success: t.menu.signedOut,
  });

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
    { success: t.menu.demoRebuilt },
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label={t.menu.open}
          className="bg-black/55 backdrop-blur-md"
        >
          <Icon icon={Menu02Icon} size={20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <div className="flex items-center justify-between gap-3 pr-2">
          <DropdownMenuLabel>{t.menu.browse}</DropdownMenuLabel>
          <span onClick={(event) => event.stopPropagation()}>
            <LanguageSwitch />
          </span>
        </div>
        <DropdownMenuSeparator />

        {/* Every panel is readable by anyone; the session gates the edits. */}
        {PANELS.map((panel) => (
          <DropdownMenuItem
            key={panel.name}
            onSelect={() => onSelect(panel.name)}
          >
            <Icon icon={panel.icon} size={17} className="text-primary" />
            <span className="flex flex-col">
              <span className="font-medium">{t.menu[panel.name]}</span>
              <span className="text-xs text-muted-foreground">
                {t.menu[`${panel.name}Hint`]}
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
              <span className="font-medium">{t.menu.resetDemo}</span>
              <span className="text-xs text-muted-foreground">
                {t.menu.resetDemoHint}
              </span>
            </span>
          </DropdownMenuItem>
        ) : null}

        {isAdmin ? (
          <DropdownMenuItem onSelect={() => void signOut.run()}>
            <Icon icon={Logout03Icon} size={17} />
            <span className="font-medium">{t.menu.signOut}</span>
          </DropdownMenuItem>
        ) : (
          <>
            <p className="px-3 py-2 text-sm leading-snug text-foreground/80">
              {t.menu.guest}
            </p>

            {authEnabled ? (
              <DropdownMenuItem onSelect={onSignIn}>
                <Icon icon={Login03Icon} size={17} className="text-primary" />
                <span className="font-medium">{t.menu.signIn}</span>
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
