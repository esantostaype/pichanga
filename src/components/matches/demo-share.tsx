"use client";

import { Share08Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState } from "react";

import { MatchHudCard } from "@/components/layout/match-hud-card";
import { PitchScene } from "@/components/pitch/pitch-scene";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { useElementSize } from "@/hooks/use-element-size";
import { demoMatch } from "@/lib/demo-match";
import { ShareDialog } from "./share-dialog";

/** Height of the floating button plus its padding, as in the real screen. */
const FAB_CLEARANCE = 48 + 16;

/** The gap the HUD keeps from the lineup, as in the real screen. */
const HUD_GAP = 12;

/**
 * The demo match on a real pitch.
 *
 * The same scene the app shows, wired to data that lives only in memory: a
 * squad of twenty-four, half of them still owing, so the lineup, the HUD and
 * the share card can all be tried without touching anybody's real fixture.
 *
 * Nothing here can be edited. The pitch reads from a constant, and there is no
 * provider behind it to write to.
 */
export function DemoShare() {
  /*
   * Read once, after mount: the clock cannot be read during render, and a demo
   * whose date drifts every thirty seconds would redraw the card for nothing.
   */
  const [now, setNow] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [hudRef, hudSize] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const match = useMemo(() => (now === null ? null : demoMatch(now)), [now]);

  if (!match) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <PitchScene
        match={match}
        hudInset={Math.max(hudSize.height, FAB_CLEARANCE) + HUD_GAP}
        bottomInset={FAB_CLEARANCE + HUD_GAP}
      />

      <div
        ref={hudRef}
        className="pointer-events-none absolute inset-x-0 top-0 p-2 md:p-4"
      >
        <div className="pointer-events-auto flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur-md md:flex-row md:items-start md:justify-between md:gap-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="flex items-center justify-between gap-3 md:contents">
            <div className="flex min-w-0 items-center gap-2 rounded-2xl md:gap-4 md:border md:border-white/10 md:bg-black/55 md:px-4 md:py-3 md:backdrop-blur-md">
              <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground">
                Demo
              </span>
              <span
                aria-hidden
                className="hidden h-11 w-px shrink-0 bg-white/10 md:block"
              />
              <div className="hidden min-w-0 md:block">
                <MatchHudCard match={match} />
              </div>
            </div>

            <Button
              variant="secondary"
              size="icon"
              aria-label="Share the lineup"
              className="bg-black/55 backdrop-blur-md"
              onClick={() => setOpen(true)}
            >
              <Icon icon={Share08Icon} size={20} />
            </Button>
          </div>

          <div className="min-w-0 border-t border-white/10 pt-2.5 md:hidden">
            <MatchHudCard match={match} />
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-xs text-muted-foreground/80">
        Nothing on this page is in the database.
      </p>

      <ShareDialog open={open} onOpenChange={setOpen} match={match} />
    </main>
  );
}
