"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { PlayerAvatar } from "@/components/players/player-avatar";
import { EASE } from "@/lib/ease";
import type { Player } from "@/types";
import { useLocale } from "@/components/providers/locale-provider";

gsap.registerPlugin(useGSAP);

/** How long the shout stays up before it clears itself. */
export const GOL_MS = 3600;

/*
 * The two halves of the shout, and the moment they overlap by.
 *
 * The way out is the way in, backwards: the name leaves the way it arrived and
 * the word follows it, over the same time and with the same ease. It used to
 * be a flat fade on both at once, which after all that arriving read as the
 * screen being switched off.
 */
const WORD_S = 0.5;
const WHO_S = 0.42;
const LAP_S = 0.22;

/** In and out take the same time, so the hold is whatever is left of it. */
const HALF_S = WORD_S + WHO_S - LAP_S;

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
  player,
  name,
  role,
  accent,
}: {
  /** The face, which is the fastest way to know who it was. */
  player: Pick<Player, "firstName" | "lastName" | "photoUrl">;
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
            duration: WORD_S,
            lazy: false,
          },
        )
        .fromTo(
          "[data-gol='face']",
          { scale: 0.7, autoAlpha: 0, y: 18 },
          { scale: 1, autoAlpha: 1, y: 0, duration: WORD_S, lazy: false },
          "<",
        )
        .fromTo(
          "[data-gol='who']",
          { y: 34, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: WHO_S },
          `-=${LAP_S}`,
        )
        // Held, then taken back the way it came: nobody dismisses a goal.
        .to({}, { duration: Math.max(0, GOL_MS / 1000 - HALF_S * 2) })
        .to("[data-gol='who']", {
          y: 34,
          autoAlpha: 0,
          duration: WHO_S,
        })
        .to(
          "[data-gol='word']",
          { scale: 0.55, rotate: -22, autoAlpha: 0, duration: WORD_S },
          `-=${LAP_S}`,
        )
        .to(
          "[data-gol='face']",
          { scale: 0.7, y: 18, autoAlpha: 0, duration: WORD_S },
          "<",
        )
        // The veil goes with the word, so the pitch is back the moment the
        // shout is -- not a beat later, over an empty screen.
        .to(scope.current, { autoAlpha: 0, duration: WORD_S }, "<");
    },
    { scope },
  );

  const { t } = useLocale();

  return (
    <div
      ref={scope}
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-background/92 px-6 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
    >
      <div className="text-center">
        {/*
          The face first, a hand above the word. Six people look up at the
          same second and the name takes a moment to read; the photo does not.
        */}
        <div data-gol="face" className="mb-4 flex justify-center">
          <PlayerAvatar
            player={player}
            className="size-[clamp(4rem,12vw,7rem)] border-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)]"
            style={{ borderColor: accent }}
          />
        </div>

        <p
          data-gol="word"
          className="inline-block text-[clamp(4rem,22vw,12rem)] uppercase leading-none"
          style={{
            fontFamily: "var(--font-scoreboard)",
            color: accent,
            textShadow: `0 0 70px ${accent}55`,
          }}
        >
          {t.common.goal}
        </p>

        <div data-gol="who" className="mt-4">
          <p className="font-display text-[clamp(1.5rem,6vw,3rem)] uppercase leading-none tracking-[0.05em]">
            {name}
          </p>
          <p
            className="mt-2.5 font-display text-[clamp(0.95rem,2.6vw,1.4rem)] uppercase leading-none tracking-[0.32em]"
            style={{ color: accent }}
          >
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}
