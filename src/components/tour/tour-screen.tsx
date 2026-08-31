"use client";

import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LanguageSwitch } from "@/components/layout/language-switch";
import { useLocale } from "@/components/providers/locale-provider";
import { PitchSurface } from "@/components/pitch/pitch-surface";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";
import { useElementSize } from "@/hooks/use-element-size";
import { cn } from "@/lib/utils";
import {
  SceneGoal,
  SceneLineup,
  SceneMoney,
  ScenePodium,
  SceneProfile,
  SceneRotation,
  SceneShare,
  SceneTeams,
} from "./scenes";
import { SmoothScroll } from "./smooth-scroll";

/**
 * What the app is, in the time it takes to scroll.
 *
 * Split by who is reading rather than by feature, because the answer to "what
 * does this do" depends entirely on which of the three you are: somebody who
 * turns up and plays, somebody who books the pitch and collects the money, and
 * whoever has the phone out while the game is on. One list of everything would
 * be two thirds noise for all three of them.
 */

type Role = "player" | "organizer" | "night";

export function TourScreen() {
  useReveal();

  const { t } = useLocale();
  const [role, setRole] = useState<Role>("player");
  const [ground, size] = useElementSize<HTMLDivElement>();

  const beats: Record<
    Role,
    Array<{ title: string; line: string; art: React.ReactNode }>
  > = {
    player: [
      {
        title: t.tour.profileTitle,
        line: t.tour.profileLine,
        art: <SceneProfile />,
      },
      {
        title: t.tour.pitchTitle,
        line: t.tour.pitchLine,
        art: <SceneLineup />,
      },
      {
        title: t.tour.seasonTitle,
        line: t.tour.seasonLine,
        art: <ScenePodium />,
      },
    ],
    organizer: [
      { title: t.tour.sidesTitle, line: t.tour.sidesLine, art: <SceneTeams /> },
      { title: t.tour.moneyTitle, line: t.tour.moneyLine, art: <SceneMoney /> },
      { title: t.tour.shareTitle, line: t.tour.shareLine, art: <SceneShare /> },
    ],
    night: [
      { title: t.tour.scoreTitle, line: t.tour.scoreLine, art: <SceneGoal /> },
      {
        title: t.tour.nightTitle,
        line: t.tour.nightLine,
        art: <SceneRotation />,
      },
    ],
  };

  return (
    <>
      {/* The pitch, the same one the match is played on. */}
      <div ref={ground} aria-hidden className="fixed inset-0 -z-10">
        <PitchSurface width={size.width} height={size.height || 1} />
        <div className="absolute inset-0 bg-background/72" />
      </div>

      {/*
        Who is asking, pinned where it can be changed from anywhere on the
        page: the three answers are three different tours, and having to
        scroll back up to switch is having to scroll back up.
      */}
      <div className="fixed left-3 top-3 z-20 md:left-8 md:top-8">
        <Tabs
          ariaLabel={t.tour.roles}
          value={role}
          onChange={(next) => setRole(next as Role)}
          items={[
            { value: "player", label: t.tour.rolePlayer },
            { value: "organizer", label: t.tour.roleOrganizer },
            { value: "night", label: t.tour.roleNight },
          ]}
        />
      </div>

      <div className="fixed bottom-4 right-4 z-20 sm:bottom-auto sm:right-5 sm:top-5 md:right-8 md:top-8">
        <LanguageSwitch />
      </div>

      <SmoothScroll>
        <main className="relative z-10">
          <div className="mx-auto w-full max-w-5xl px-6">
            <section className="flex min-h-[92svh] flex-col items-center justify-center gap-7 py-20 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-tour
                src="/images/logo.svg"
                alt="Pichanga"
                className="w-56 md:w-72"
              />

              <h1
                data-tour
                className="font-display text-[clamp(2.75rem,8vw,5.5rem)] uppercase leading-[0.92]"
              >
                {t.tour.heroTitle}
                <span className="text-primary"> {t.tour.heroTitleAccent}</span>
              </h1>

              <p
                data-tour
                className="mx-auto max-w-xl text-balance text-lg text-muted-foreground"
              >
                {t.tour.heroLine}
              </p>

              <div data-tour className="flex flex-wrap justify-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/" className="no-underline">
                    {t.tour.openPitch}
                    <Icon icon={ArrowRight02Icon} size={18} />
                  </Link>
                </Button>
                <Button size="lg" variant="soft" asChild>
                  <Link href="/demo" className="no-underline">
                    {t.tour.tryDemo}
                  </Link>
                </Button>
              </div>
            </section>

            <p
              data-tour
              className="mx-auto max-w-xl text-balance text-center text-lg text-muted-foreground md:text-xl"
            >
              {role === "player"
                ? t.tour.rolePlayerLine
                : role === "organizer"
                  ? t.tour.roleOrganizerLine
                  : t.tour.roleNightLine}
            </p>

            <div className="flex flex-col gap-16 py-14 md:gap-24 md:py-20">
              {beats[role].map((beat, index) => (
                <Beat
                  key={`${role}-${beat.title}`}
                  index={String(index + 1).padStart(2, "0")}
                  title={beat.title}
                  line={beat.line}
                  flip={index % 2 === 1}
                >
                  {beat.art}
                </Beat>
              ))}
            </div>

            <section
              data-tour
              className="flex flex-col items-center gap-6 pb-40 pt-4 text-center md:pb-48"
            >
              <p className="font-display text-[clamp(2rem,5.5vw,3.5rem)] uppercase leading-[0.95]">
                {t.tour.closeTitle}
                <br />
                <span className="text-primary">{t.tour.closeAccent}</span>
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/" className="no-underline">
                    {t.tour.openPitch}
                    <Icon icon={ArrowRight02Icon} size={18} />
                  </Link>
                </Button>
                <Button size="lg" variant="soft" asChild>
                  <Link href="/demo" className="no-underline">
                    {t.tour.tryDemoAgain}
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </main>
      </SmoothScroll>
    </>
  );
}

/** One thing the app does, and the thing itself beside it. */
function Beat({
  index,
  title,
  line,
  flip,
  children,
}: {
  index: string;
  title: string;
  line: string;
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      data-tour
      className="grid items-center gap-12 rounded-3xl border border-white/8 bg-background/20 p-6 backdrop-blur-sm md:grid-cols-2 md:gap-12 md:p-16"
    >
      <div className={cn("flex flex-col gap-3", flip && "md:order-2")}>
        <span className="font-display text-sm uppercase tracking-[0.3em] text-primary">
          {index}
        </span>

        <h2 className="font-display text-[clamp(1.8rem,4.5vw,3rem)] uppercase leading-[0.95]">
          {title}
        </h2>

        <p className="max-w-md text-balance text-base text-muted-foreground md:text-lg">
          {line}
        </p>
      </div>

      <div className={cn("min-w-0", flip && "md:order-1")}>{children}</div>
    </section>
  );
}

/**
 * Arrives as you reach it.
 *
 * The hidden state is put on by JavaScript, so with none the page is simply
 * there -- this is the one page that has to work for somebody who has never
 * opened the app. The observer is the efficient path; the interval under it is
 * the honest one, and it also catches the sections the tabs swap in, which the
 * observer never saw at mount.
 */
function useReveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reveal = "on";

    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.seen = "true";
          seen.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    const watch = () =>
      document
        .querySelectorAll("[data-tour]:not([data-seen])")
        .forEach((node) => {
          seen.observe(node);

          const box = node.getBoundingClientRect();
          if (box.top < window.innerHeight * 0.95 && box.bottom > 0) {
            (node as HTMLElement).dataset.seen = "true";
          }
        });

    watch();

    const rescue = window.setInterval(watch, 400);

    return () => {
      seen.disconnect();
      window.clearInterval(rescue);
      delete root.dataset.reveal;
    };
  }, []);
}
