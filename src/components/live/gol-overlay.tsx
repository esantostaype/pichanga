"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { EASE } from "@/lib/ease";

gsap.registerPlugin(useGSAP);

/** How long the shout stays up before it clears itself. */
export const GOL_MS = 3600;

/**
 * GOAL, across the whole screen, on every phone at the ground at once.
 *
 * The word and who scored it, and nothing else. There was a ball hitting a net
 * here; it was the better drawing and the worse thing to look at, because the
 * only two facts anybody wants in that second are *goal* and *who*, and they
 * were the two things arriving last.
 *
 * It is the only thing in the app that takes over the display, which is the
 * point: everybody looks up at the same moment, the way they would anyway.
 */
export function GolOverlay({
  name,
  role,
  accent,
}: {
  name: string;
  /** Their area, the way their card shows it. */
  role: string;
  accent: string;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const timeline = gsap.timeline({ defaults: { ease: EASE } });

      timeline
        .fromTo(
          "[data-gol='word']",
          { scale: 0.55, autoAlpha: 0, rotate: -22 },
          {
            scale: 1,
            autoAlpha: 1,
            rotate: -10,
            duration: 0.5,
            lazy: false,
          },
        )
        .fromTo(
          "[data-gol='who']",
          { y: 34, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.42 },
          "-=0.22",
        )
        // Held, then dropped: nobody should have to dismiss a goal.
        .to({}, { duration: GOL_MS / 1000 - 1.4 })
        .to("[data-gol]", { autoAlpha: 0, duration: 0.45 });
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-background/92 px-6 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
    >
      <div className="text-center">
        <p
          data-gol="word"
          className="inline-block text-[clamp(4rem,22vw,12rem)] uppercase leading-none"
          style={{
            fontFamily: "var(--font-scoreboard)",
            color: accent,
            textShadow: `0 0 70px ${accent}55`,
          }}
        >
          Goal
        </p>

        <div data-gol="who" className="mt-4">
          <p className="font-display text-[clamp(1.5rem,6vw,3rem)] uppercase leading-none tracking-[0.05em]">
            {name}
          </p>
          <p
            className="mt-2.5 font-display text-sm uppercase tracking-[0.32em]"
            style={{ color: accent }}
          >
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}
