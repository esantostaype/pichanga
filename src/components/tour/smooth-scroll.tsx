"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother);

/**
 * Scrolling with weight to it.
 *
 * `ScrollSmoother` moves the page by transforming a wrapper rather than by
 * scrolling it, which is exactly why this is not switched on app-wide: a
 * transformed ancestor is a new containing block, and every `position: fixed`
 * header in the app -- the one on the lineup, the one on match night -- would
 * stop being fixed to the window and start being fixed to a moving box. The
 * pitch screens do not scroll at all either, so there would be nothing to
 * smooth.
 *
 * Here it costs nothing: this page is one long column, and the two things that
 * stay put -- the wordmark and the language switch -- are rendered outside the
 * wrapper on purpose.
 *
 * On a phone nobody gets it. `ScrollSmoother` moves the page itself and
 * `normalizeScroll` takes the touch events off the browser to do it, and iOS
 * does not give those up cleanly: the address bar stops collapsing, momentum
 * fights the tween and the page ends up feeling stuck. The native scroll on a
 * phone is already the good one.
 *
 * Anybody who has asked for less motion gets the browser's own scrolling too.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const quiet = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (quiet.matches) return;

      // A mouse, a real hover, and a window wide enough to be a desktop.
      const desktop = window.matchMedia(
        "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
      );
      if (!desktop.matches) return;

      const smoother = ScrollSmoother.create({
        wrapper: wrapper.current,
        content: content.current,
        // A little over a tenth of a second of catch-up: enough to feel like
        // weight, not enough to feel like lag when somebody is looking for
        // the bottom of the page.
        smooth: 1.1,
        effects: false,
        normalizeScroll: true,
      });

      return () => smoother.kill();
    },
    { scope: wrapper },
  );

  return (
    <div ref={wrapper} id="smooth-wrapper">
      <div ref={content} id="smooth-content">
        {children}
      </div>
    </div>
  );
}
