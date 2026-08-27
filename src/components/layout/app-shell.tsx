"use client";

import { useGSAP } from "@gsap/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import gsap from "gsap";
import { useState } from "react";

import { AddPlayersDialog } from "@/components/matches/add-players-dialog";
import { MatchesDrawer } from "@/components/matches/matches-drawer";
import { PitchScene } from "@/components/pitch/pitch-scene";
import { PlacesDrawer } from "@/components/places/places-drawer";
import { PlayersDrawer } from "@/components/players/players-drawer";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { useAction } from "@/hooks/use-action";
import { useElementSize } from "@/hooks/use-element-size";
import { EASE } from "@/lib/ease";
import type { Player } from "@/types";
import { AppMenu, type PanelName } from "./app-menu";
import { Brand } from "./brand";
import { LoginDialog } from "./login-dialog";
import { MatchHudCard } from "./match-hud-card";

export function AppShell() {
  const { nextMatch, removePlayerFromNextMatch } = usePichanga();

  const [panel, setPanel] = useState<PanelName | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  /** Dropping someone is confirmed: on touch screens one tap is enough. */
  const [pendingRemoval, setPendingRemoval] = useState<Player | null>(null);

  // The HUD floats over the pitch, so the lineup keeps that band clear.
  const [hudRef, hudSize] = useElementSize<HTMLDivElement>();

  const removeFromLineup = useAction(
    async (player: Player) => removePlayerFromNextMatch(player.id),
    {
      success: "Player removed from the lineup",
      onSuccess: () => setPendingRemoval(null),
    },
  );

  useGSAP(
    () => {
      // Only `y` is animated on purpose: `autoAlpha` would start the HUD at
      // visibility:hidden, and if the tween never ticks (throttled tab, GSAP
      // arriving late) the controls stay invisible and unclickable.
      gsap.from(hudRef.current?.children ?? [], {
        y: -14,
        duration: 0.6,
        stagger: 0.08,
        ease: EASE,
      });
    },
    { scope: hudRef },
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <PitchScene
        match={nextMatch}
        hudInset={hudSize.height ? hudSize.height + 10 : 0}
        onRemovePlayer={setPendingRemoval}
      />

      {/* Overlaid HUD: the pitch fills 100% of the screen */}
      <div
        ref={hudRef}
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-2 md:p-4"
      >
        {/* Logo and match details share one card, 16px from the top-left. */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-2 md:px-4 md:py-3 backdrop-blur-md sm:gap-4">
          <Brand />
          <span aria-hidden className="h-11 w-px shrink-0 bg-white/10 hidden md:block" />
          <MatchHudCard match={nextMatch} />
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            size="icon"
            aria-label="Add players to the match"
            disabled={!nextMatch}
            onClick={() => setAddOpen(true)}
          >
            <Icon icon={PlusSignIcon} size={20} strokeWidth={2.2} />
          </Button>

          <AppMenu onSelect={setPanel} onSignIn={() => setLoginOpen(true)} />
        </div>
      </div>

      <MatchesDrawer
        open={panel === "matches"}
        onOpenChange={(open) => setPanel(open ? "matches" : null)}
      />

      <PlayersDrawer
        open={panel === "players"}
        onOpenChange={(open) => setPanel(open ? "players" : null)}
      />

      <PlacesDrawer
        open={panel === "places"}
        onOpenChange={(open) => setPanel(open ? "places" : null)}
      />

      <AddPlayersDialog open={addOpen} onOpenChange={setAddOpen} />

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />

      <ConfirmDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title="Remove from match"
        description={
          pendingRemoval
            ? `${pendingRemoval.firstName} ${pendingRemoval.lastName} will leave the lineup. Their profile is kept.`
            : undefined
        }
        confirmLabel="Remove"
        pending={removeFromLineup.pending}
        onConfirm={() =>
          pendingRemoval && void removeFromLineup.run(pendingRemoval)
        }
      />
    </main>
  );
}
