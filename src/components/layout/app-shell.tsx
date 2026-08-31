"use client";

import { useGSAP } from "@gsap/react";
import {
  PlusSignIcon,
  StopWatchIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import gsap from "gsap";
import { useCallback, useRef, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { AddPlayersDialog } from "@/components/matches/add-players-dialog";
import { GalleryDialog } from "@/components/matches/gallery-dialog";
import { MatchesDrawer } from "@/components/matches/matches-drawer";
import { PaymentsDialog } from "@/components/matches/payments-dialog";
import { ShareDialog } from "@/components/matches/share-dialog";
import { TeamsDialog, newSeed } from "@/components/matches/teams-dialog";
import { PitchScene } from "@/components/pitch/pitch-scene";
import { PlacesDrawer } from "@/components/places/places-drawer";
import { PlayerCardDialog } from "@/components/players/player-card-dialog";
import { PlayerFormDialog } from "@/components/players/player-form-dialog";
import { PlayersDrawer } from "@/components/players/players-drawer";
import { StatsDrawer } from "@/components/stats/stats-drawer";
import { usePichanga } from "@/components/providers/pichanga-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { useElementSize } from "@/hooks/use-element-size";
import { useNow } from "@/hooks/use-now";
import { useVisitorHeartbeat } from "@/hooks/use-presence";
import { fill } from "@/i18n/dictionaries";
import { TEAMS_OPEN_MS } from "@/lib/constants";
import { matchSlug } from "@/lib/date";
import { EASE } from "@/lib/ease";
import type { Player } from "@/types";
import { AppHeader } from "./app-header";
import { type PanelName } from "./app-menu";
import { useScene } from "./scene-transition";
import { LiveVisitors } from "./live-visitors";
import { LoginDialog } from "./login-dialog";

/**
 * What the floating add button occupies at the bottom right: its own height,
 * the strip padding around it and the offset that strip sits at. Measured
 * against the real thing -- guessing left the last row four pixels under it.
 */
const FAB_CLEARANCE = 48 + 16 + 16;

/** The same `gap-3` the HUD uses inside itself, kept below it too. */
const HUD_GAP = 12;

export function AppShell() {
  const { t } = useLocale();
  const {
    nextMatch,
    isAdmin,
    isSuperAdmin,
    removePlayerFromNextMatch,
    setPlayerPaid,
    drawTeams,
    setKeeper,
    demo,
  } = usePichanga();

  // Everyone counts, so this runs for guests too. It reports nothing but an
  // id this browser made up for itself.
  useVisitorHeartbeat();

  const [panel, setPanel] = useState<PanelName | null>(null);
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);
  /*
   * Whose card is open, from a tap on their name anywhere on the pitch.
   *
   * Two pieces of state rather than one: closing only lowers the flag, and
   * the player stays until the next tap replaces them. Clearing them on close
   * unmounted the dialog on the spot, so it went in with a transition and out
   * with nothing.
   */
  const [viewing, setViewing] = useState<Player | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);

  const viewPlayer = useCallback((player: Player) => {
    setViewing(player);
    setCardOpen(true);
  }, []);

  // The button turns up two hours before kick-off, so the shell needs a clock.
  const now = useNow(60_000);
  const { go } = useScene();

  /*
   * Played out. The night is closed, so there is nothing to draw sides for and
   * nothing left to keep score of: the screen goes back to the notice it was,
   * and the two match-day buttons go with it.
   */
  const over = !!nextMatch && now !== null && now >= nextMatch.endsAt;

  const hasTeams = !over && (nextMatch?.teams.length ?? 0) > 0;
  const teamsOpen =
    !over &&
    !!nextMatch &&
    nextMatch.players.length >= 4 &&
    (hasTeams || (now !== null && now >= nextMatch.playedAt - TEAMS_OPEN_MS));

  /*
   * The app names a keeper for every side and is usually right, but it cannot
   * know whose knee hurts. When this is allowed is the server's rule -- with
   * three sides it refuses while a game is being played -- and the toast
   * carries the refusal back.
   */
  const gloves = useAction(
    async ({ teamId, playerId }: { teamId: string; playerId: string }) =>
      setKeeper(teamId, playerId),
    { success: t.teams.keeperChanged },
  );

  /*
   * Whose gloves are in flight. The button they were pressed on is only
   * visible while the token is hovered, and a spinner that disappears when the
   * mouse moves away answers nothing.
   */
  const [handing, setHanding] = useState<string | null>(null);

  const handOver = (teamId: string, playerId: string) => {
    setHanding(playerId);
    void gloves.run({ teamId, playerId }).finally(() => setHanding(null));
  };

  const draw = useAction(async () => drawTeams(newSeed()), {
    success: t.pitch.teamsDrawn,
    onSuccess: () => setTeamsDialogOpen(true),
  });
  const [addOpen, setAddOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  /** Dropping someone is confirmed: on touch screens one tap is enough. */
  const [pendingRemoval, setPendingRemoval] = useState<Player | null>(null);

  // The HUD floats over the pitch, so the lineup keeps that band clear.
  const [hudRef, hudSize] = useElementSize<HTMLDivElement>();
  // GSAP wants a node it can hold on to; the measurement wants a callback.
  const hudNode = useRef<HTMLDivElement | null>(null);
  const setHud = useCallback(
    (node: HTMLDivElement | null) => {
      hudNode.current = node;
      hudRef(node);
    },
    [hudRef],
  );

  const settle = useAction(
    async ({ player, paid }: { player: Player; paid: boolean }) =>
      setPlayerPaid(player.id, paid),
  );

  const removeFromLineup = useAction(
    async (player: Player) => removePlayerFromNextMatch(player.id),
    {
      success: t.pitch.playerRemoved,
      onSuccess: () => setPendingRemoval(null),
    },
  );

  useGSAP(
    () => {
      // Only `y` is animated on purpose: `autoAlpha` would start the HUD at
      // visibility:hidden, and if the tween never ticks (throttled tab, GSAP
      // arriving late) the controls stay invisible and unclickable.
      gsap.from(hudNode.current?.children ?? [], {
        y: -14,
        duration: 0.6,
        stagger: 0.08,
        ease: EASE,
      });
    },
    { scope: hudNode },
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <PitchScene
        match={nextMatch}
        over={over}
        // The band is reserved on both edges, so it also has to clear the
        // floating button sitting at the bottom right.
        hudInset={Math.max(hudSize.height, FAB_CLEARANCE) + HUD_GAP}
        // Only the floating button sits down there, so the list keeps just it
        // clear rather than mirroring the whole HUD.
        bottomInset={FAB_CLEARANCE + HUD_GAP}
        onRemovePlayer={setPendingRemoval}
        onViewPlayer={viewPlayer}
        onSetKeeper={hasTeams ? handOver : undefined}
        keeperPending={handing}
        // The mark stays read-only for everyone else: the server refuses it
        // anyway, and a button that always fails is worse than no button.
        onTogglePaid={
          isAdmin
            ? (player, paid) => void settle.run({ player, paid })
            : undefined
        }
      />

      {/* The same header the whole app wears, measured so the pitch clears it. */}
      <AppHeader
        match={nextMatch}
        hudRef={setHud}
        onOpenPayments={() => setPaymentsOpen(true)}
        onShare={() => setShareOpen(true)}
        onGallery={() => setGalleryOpen(true)}
        onSelectPanel={setPanel}
        onSignIn={() => setLoginOpen(true)}
      />

      {/* Adding players is the one thing everyone does, so it gets the thumb. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-end gap-3 p-4">
        {/* Stays out of the way: no background, no pointer events, no chrome. */}
        {isSuperAdmin ? <LiveVisitors /> : null}

        {/*
          Match day lives by the thumb, not in the corner with the browsing.
          Drawing the sides and keeping score both happen with a phone in one
          hand at the ground, so they sit beside the button that is already
          there -- softer than it, because it is still the one you press most.

          In a row on a phone and a column on a screen: three buttons stacked
          up the side of a small display climb into the lineup, while across
          the bottom they are all under the same thumb.
        */}
        <div className="pointer-events-auto ml-auto flex flex-row items-center gap-3 sm:flex-col sm:items-end">
          {teamsOpen ? (
            <Button
              variant="soft"
              size="icon-lg"
              aria-label={hasTeams ? t.pitch.teams : t.pitch.drawTeams}
              disabled={draw.pending}
              onClick={() => {
                if (hasTeams) setTeamsDialogOpen(true);
                else void draw.run();
              }}
            >
              {draw.pending ? (
                <Spinner />
              ) : (
                <Icon icon={UserGroupIcon} size={22} />
              )}
            </Button>
          ) : null}

          {hasTeams && nextMatch ? (
            <Button
              variant="soft"
              size="icon-lg"
              aria-label={t.pitch.matchNight}
              onClick={() =>
                go(
                  demo
                    ? "/demo/live"
                    : `/match/${matchSlug(nextMatch.playedAt)}/live`,
                )
              }
            >
              <Icon icon={StopWatchIcon} size={22} />
            </Button>
          ) : null}

          <Button
            size="icon-lg"
            aria-label={t.pitch.addPlayers}
            disabled={!nextMatch}
            onClick={() => setAddOpen(true)}
          >
            <Icon icon={PlusSignIcon} size={22} strokeWidth={2.2} />
          </Button>
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

      <StatsDrawer
        open={panel === "stats"}
        onOpenChange={(open) => setPanel(open ? "stats" : null)}
      />

      <AddPlayersDialog open={addOpen} onOpenChange={setAddOpen} />

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />

      <PlayerCardDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        player={viewing}
        isOrganizer={!!viewing && viewing.id === nextMatch?.organizerId}
        onEdit={
          isAdmin
            ? (player) => {
                setCardOpen(false);
                setEditing(player);
              }
            : undefined
        }
      />

      <PlayerFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        player={editing}
      />

      <TeamsDialog
        open={teamsDialogOpen}
        onOpenChange={setTeamsDialogOpen}
        match={nextMatch}
      />

      <PaymentsDialog
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
        match={nextMatch}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        match={nextMatch}
      />

      <GalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        matchId={nextMatch?.id ?? null}
        playedAt={nextMatch?.playedAt ?? null}
      />

      <ConfirmDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={fill(t.pitch.dropTitle, {
          name: pendingRemoval?.firstName ?? "",
        })}
        description={pendingRemoval ? t.pitch.dropLine : undefined}
        confirmLabel={t.pitch.dropConfirm}
        pending={removeFromLineup.pending}
        onConfirm={() =>
          pendingRemoval && void removeFromLineup.run(pendingRemoval)
        }
      />
    </main>
  );
}
