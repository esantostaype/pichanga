"use client";

import { useGSAP } from "@gsap/react";
import { Album02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import gsap from "gsap";
import { useState } from "react";

import { AddPlayersDialog } from "@/components/matches/add-players-dialog";
import { GalleryDialog } from "@/components/matches/gallery-dialog";
import { MatchesDrawer } from "@/components/matches/matches-drawer";
import { PaymentsDialog } from "@/components/matches/payments-dialog";
import { PitchScene } from "@/components/pitch/pitch-scene";
import { PlacesDrawer } from "@/components/places/places-drawer";
import { PlayersDrawer } from "@/components/players/players-drawer";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { useAction } from "@/hooks/use-action";
import { useElementSize } from "@/hooks/use-element-size";
import { useVisitorHeartbeat } from "@/hooks/use-presence";
import { EASE } from "@/lib/ease";
import type { Player } from "@/types";
import { AppMenu, type PanelName } from "./app-menu";
import { Brand } from "./brand";
import { LiveVisitors } from "./live-visitors";
import { LoginDialog } from "./login-dialog";
import { MatchHudCard } from "./match-hud-card";
import { MatchInfoButton } from "./match-info-button";

/** Height of the floating add button plus its padding. */
const FAB_CLEARANCE = 48 + 16;

export function AppShell() {
  const {
    nextMatch,
    isAdmin,
    isSuperAdmin,
    removePlayerFromNextMatch,
    setPlayerPaid,
  } = usePichanga();

  // Everyone counts, so this runs for guests too. It reports nothing but an
  // id this browser made up for itself.
  useVisitorHeartbeat();

  const [panel, setPanel] = useState<PanelName | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  /** Dropping someone is confirmed: on touch screens one tap is enough. */
  const [pendingRemoval, setPendingRemoval] = useState<Player | null>(null);

  // The HUD floats over the pitch, so the lineup keeps that band clear.
  const [hudRef, hudSize] = useElementSize<HTMLDivElement>();

  const settle = useAction(
    async ({ player, paid }: { player: Player; paid: boolean }) =>
      setPlayerPaid(player.id, paid),
  );

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
        // The band is reserved on both edges, so it also has to clear the
        // floating button sitting at the bottom right.
        hudInset={Math.max(hudSize.height, FAB_CLEARANCE) + 10}
        onRemovePlayer={setPendingRemoval}
        // The mark stays read-only for everyone else: the server refuses it
        // anyway, and a button that always fails is worse than no button.
        onTogglePaid={
          isAdmin
            ? (player, paid) => void settle.run({ player, paid })
            : undefined
        }
      />

      {/* Overlaid HUD: the pitch fills 100% of the screen */}
      <div
        ref={hudRef}
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center md:items-start justify-between gap-3 p-2 md:p-4"
      >
        {/*
          On a phone this is the bare logo: no card, no padding, so the pitch
          stays visible. From md up it becomes the card with the details beside
          the logo.
        */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-2xl md:border md:border-white/10 md:bg-black/55 md:px-4 md:py-3 md:backdrop-blur-md md:gap-4">
          <Brand />
          <span aria-hidden className="hidden h-11 w-px shrink-0 bg-white/10 md:block" />
          <div className="hidden min-w-0 md:block">
            <MatchHudCard
              match={nextMatch}
              onOpenPayments={() => setPaymentsOpen(true)}
            />
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* The album of the match on the pitch. Everyone can add to it. */}
          <Button
            variant="secondary"
            size="icon"
            aria-label="Match gallery"
            className="bg-black/55 backdrop-blur-md"
            disabled={!nextMatch}
            onClick={() => setGalleryOpen(true)}
          >
            <Icon icon={Album02Icon} size={20} />
          </Button>

          {/* The details live behind this button only where they are hidden. */}
          <MatchInfoButton
            match={nextMatch}
            className="md:hidden"
            onOpenPayments={() => setPaymentsOpen(true)}
          />
          <AppMenu onSelect={setPanel} onSignIn={() => setLoginOpen(true)} />
        </div>
      </div>

      {/* Adding players is the one thing everyone does, so it gets the thumb. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-end gap-3 p-4">
        {/* Stays out of the way: no background, no pointer events, no chrome. */}
        {isSuperAdmin ? <LiveVisitors /> : null}

        <Button
          size="icon-lg"
          className="pointer-events-auto ml-auto"
          aria-label="Add players to the match"
          disabled={!nextMatch}
          onClick={() => setAddOpen(true)}
        >
          <Icon icon={PlusSignIcon} size={22} strokeWidth={2.2} />
        </Button>
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

      <PaymentsDialog open={paymentsOpen} onOpenChange={setPaymentsOpen} />

      <GalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        matchId={nextMatch?.id ?? null}
        playedAt={nextMatch?.playedAt ?? null}
      />

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
