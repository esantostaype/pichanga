"use client";

import { Album02Icon, Share08Icon } from "@hugeicons/core-free-icons";
import type { Ref } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Match } from "@/types";
import { AppMenu, type PanelName } from "./app-menu";
import { Brand } from "./brand";
import { MatchHudCard } from "./match-hud-card";

/**
 * The header, wherever the app is.
 *
 * One component rather than one per screen: the lineup and match night are the
 * same application, and a header that was copied would be two headers a week
 * later. Whatever changes here changes on both.
 *
 * On a phone it is one card -- controls on top, details under them -- so the
 * lineup scrolling underneath never passes behind a bare logo. From md up it
 * goes back to two floating pieces, the logo carrying the details beside it and
 * the buttons off to the right.
 */
export function AppHeader({
  match,
  hudRef,
  onOpenPayments,
  onShare,
  onGallery,
  onSelectPanel,
  onSignIn,
  fixed,
}: {
  match: Match | null;
  /** Measured by the pitch, so no token ever sits under it. */
  hudRef?: Ref<HTMLDivElement>;
  /**
   * Pinned to the window rather than to the screen it sits on.
   *
   * The lineup fills the viewport and never scrolls, so `absolute` is already
   * pinned there. Match night is a page that grows past the bottom, and a
   * header that scrolls away takes the way out with it.
   */
  fixed?: boolean;
  onOpenPayments: () => void;
  onShare: () => void;
  onGallery: () => void;
  onSelectPanel: (panel: PanelName) => void;
  onSignIn: () => void;
}) {
  return (
    <div
      ref={hudRef}
      className={cn(
        "pointer-events-none inset-x-0 top-0 z-40 p-2 md:p-4",
        fixed ? "fixed" : "absolute",
      )}
    >
      <div className="pointer-events-auto flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur-md md:flex-row md:items-start md:justify-between md:gap-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        {/* `md:contents` hands the two halves back to the row above. */}
        <div className="flex items-center justify-between gap-3 md:contents">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl md:gap-4 md:border md:border-white/10 md:bg-black/55 md:px-4 md:py-3 md:backdrop-blur-md">
            <Brand />
            <span
              aria-hidden
              className="hidden h-11 w-px shrink-0 bg-white/10 md:block"
            />
            <div className="hidden min-w-0 md:block">
              <MatchHudCard match={match} onOpenPayments={onOpenPayments} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* The lineup as a picture, or as a message. */}
            <Button
              variant="secondary"
              size="icon"
              aria-label="Share the lineup"
              className="bg-black/55 backdrop-blur-md"
              disabled={!match}
              onClick={onShare}
            >
              <Icon icon={Share08Icon} size={20} />
            </Button>

            {/* The album of the match on the pitch. Everyone can add to it. */}
            <Button
              variant="secondary"
              size="icon"
              aria-label="Match gallery"
              className="bg-black/55 backdrop-blur-md"
              disabled={!match}
              onClick={onGallery}
            >
              <Icon icon={Album02Icon} size={20} />
            </Button>

            <AppMenu onSelect={onSelectPanel} onSignIn={onSignIn} />
          </div>
        </div>

        {match ? (
          <div className="min-w-0 border-t border-white/10 pt-2.5 md:hidden">
            <MatchHudCard match={match} onOpenPayments={onOpenPayments} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
