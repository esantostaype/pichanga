"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { cn } from "@/lib/utils";

type SceneValue = {
  /** Navigates behind the wipe, which stays shut until the page is ready. */
  go: (href: string) => void;
  navigating: boolean;
};

const SceneContext = createContext<SceneValue | null>(null);

/** How long a slab takes to cross. The whole cut is paced off this. */
const SWEEP_MS = 620;
const CLEAR_MS = 420;

/** The ball fades in once the last slab has landed. */
const BALL_AFTER_MS = 700;

/**
 * The cut always holds this long, however fast the page arrives: the ball's
 * full second of bouncing, plus the moment it takes to appear. A transition
 * that blinks past is worse than none.
 */
const MIN_ON_SCREEN_MS = BALL_AFTER_MS + 1000;

/**
 * And never longer than this, whatever happens.
 *
 * The cut opens when React says the page is ready. If a navigation fails or
 * is abandoned that never comes, and this is what stops the screen being
 * covered for good.
 */
const MAX_ON_SCREEN_MS = 4000;

/**
 * The cut between one screen and the next.
 *
 * A page here is a server component that talks to the database, so a click on a
 * date is a round trip before anything can change. Rather than leave the old
 * screen sitting there looking stuck, a diagonal wipe closes over it from both
 * edges, holds -- ball bouncing -- and opens on the new one, the way a
 * broadcast covers a cut to a replay.
 *
 * `useTransition` is what makes the hold honest: React keeps `isPending` true
 * until the new page is ready to paint, so the wipe never opens on a half-built
 * screen. The minimum above is the other half of the bargain -- it never opens
 * before the ball has had its second, either.
 */
export function SceneTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startTransition] = useTransition();
  const [closed, setClosed] = useState(false);
  const shownAt = useRef(0);
  const close = useCallback(() => {
    // The clock starts on the first close and runs to the open, so a second
    // close over an already-covered screen does not push the opening back.
    if (!shownAt.current) shownAt.current = Date.now();
    setClosed(true);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      startTransition(() => router.push(href));
    },
    [close, router],
  );

  /* Opens once the new screen is there, and not before its second is up. */
  useEffect(() => {
    if (!closed || navigating || !shownAt.current) return;

    const left = MIN_ON_SCREEN_MS - (Date.now() - shownAt.current);
    const timer = setTimeout(
      () => {
        shownAt.current = 0;
        setClosed(false);
      },
      Math.max(0, left),
    );

    return () => clearTimeout(timer);
    // `closed` belongs here: closing the cut is what has to start it opening.
  }, [closed, navigating, pathname]);

  /* Nothing keeps the screen covered: if no signal comes, it opens anyway. */
  useEffect(() => {
    if (!closed) return;

    const bail = setTimeout(() => {
      shownAt.current = 0;
      setClosed(false);
    }, MAX_ON_SCREEN_MS);

    return () => clearTimeout(bail);
  }, [closed]);

  /*
   * Every link in the app, without every link having to know about this.
   *
   * The alternative was a hook in each place that navigates, and the ones that
   * were missed -- a match card, the way back -- were exactly the navigations
   * that looked broken next to the ones that had it. Caught in the capture
   * phase, before Next's own handler, which then stands down because the click
   * has already been taken.
   */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      // A modified click is asking for a tab, a window or a download.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;

      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // A link to the page you are already on would play the whole cut to
      // arrive back where you started.
      if (url.pathname === window.location.pathname) return;

      event.preventDefault();
      go(url.pathname + url.search + url.hash);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [go]);

  /*
   * Back and forward are the browser's, and they are left alone.
   *
   * A traversal is instant -- the page it goes to is already fetched -- so
   * there is nothing to cover for, and covering it anyway meant watching a
   * two-second cut play over a screen that had already arrived. Holding the
   * traversal to fix that put a second's wait on the one control people press
   * when they want out of somewhere. The cut is for the waits the app itself
   * creates.
   */

  const value = useMemo(() => ({ go, navigating }), [go, navigating]);

  return (
    <SceneContext.Provider value={value}>
      {children}
      <SceneCurtain closed={closed} />
    </SceneContext.Provider>
  );
}

export function useScene() {
  const value = useContext(SceneContext);
  if (!value) throw new Error("useScene needs a SceneTransitionProvider");
  return value;
}

/**
 * The wipe: five pairs of slabs at 40 degrees closing in from both edges, each
 * pair covering the one before it until the screen is solid.
 *
 * Every colour is a band in its own right, the lime included -- it used to be a
 * 4px hairline on the edge of each half, and two halves meeting in the middle
 * read as a pair of lines rather than as a stripe.
 *
 * They are skewed rectangles wider and taller than the screen, sliding
 * sideways -- the diagonal is the skew, not a clip path, so the two halves meet
 * along one straight line at any size.
 */
/*
 * The gap between one slab and the next is what you actually see of the colour
 * underneath: the wider the gap, the wider the band it leaves behind. They are
 * deliberately uneven -- wide, narrower, wide -- and none of them small enough
 * to read as a line rather than a band.
 */
const SLABS = [
  { color: "var(--scene-cut-light)", in: 0, out: 330 },
  // The bright one, and the only one that is not a green.
  { color: "var(--primary)", in: 130, out: 240 },
  { color: "var(--scene-cut-mid)", in: 240, out: 160 },
  { color: "var(--scene-cut)", in: 350, out: 80 },
  // Lands last and holds the screen: the colour the cut settles on.
  { color: "var(--primary-foreground)", in: 470, out: 0 },
];

function SceneCurtain({ closed }: { closed: boolean }) {
  return (
    <div
      aria-hidden={!closed}
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      {SLABS.map((slab) => (
        <span key={slab.color}>
          <Slab slab={slab} closed={closed} side="left" />
          <Slab slab={slab} closed={closed} side="right" />
        </span>
      ))}

      {/*
        No logo: the wipe is the branding, and a mark under a bouncing ball
        turns a transition into a splash screen.
      */}
      <div
        className={cn(
          "absolute inset-0 grid place-items-center transition-opacity ease-pichanga",
          closed ? "opacity-100 duration-200" : "opacity-0 duration-100",
        )}
        style={{ transitionDelay: closed ? `${BALL_AFTER_MS}ms` : "0ms" }}
      >
        <div className="relative grid h-24 place-items-end">
          <span className="animate-scene-ball">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/ball.png"
              alt=""
              className="size-14 drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]"
            />
          </span>

          <span className="animate-scene-ball-shadow absolute -bottom-3 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-black blur-[3px]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Half of one colour. Both halves carry the same skew, so the edges facing each
 * other are parallel and meet on the centre line without a gap.
 */
function Slab({
  slab,
  closed,
  side,
}: {
  slab: (typeof SLABS)[number];
  closed: boolean;
  side: "left" | "right";
}) {
  const fromLeft = side === "left";

  return (
    <span
      className={cn(
        "absolute -inset-y-1/2 w-[150vw] -skew-x-[40deg] transition-transform ease-pichanga",
        fromLeft ? "right-1/2" : "left-1/2",
        closed
          ? "translate-x-0"
          : fromLeft
            ? "-translate-x-[110%]"
            : "translate-x-[110%]",
      )}
      style={{
        background: slab.color,
        transitionDuration: `${closed ? SWEEP_MS : CLEAR_MS}ms`,
        // Arriving they stack up in order; leaving, the last one goes first so
        // the brighter slabs are what finally clears the screen.
        transitionDelay: `${closed ? slab.in : slab.out}ms`,
      }}
    />
  );
}
