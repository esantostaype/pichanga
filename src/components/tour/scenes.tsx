"use client";

import {
  ChampionIcon,
  FootballIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { Icon } from "@/components/ui/icon";
import { skillLabel } from "@/i18n/dictionaries";
import { getArea, TEAM_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The little films.
 *
 * Every one of them loops for ever on CSS keyframes rather than a timeline in
 * JavaScript: they are decoration on a page somebody reads once, they must
 * survive a tab that has been in the background all morning, and a tween that
 * never gets a frame leaves whatever it was hiding hidden.
 *
 * They are also frameless -- no card, no border. The pitch behind the page is
 * the surface; a box around each one turned the tour into a slide deck.
 */

const LIME = "#c6f432";

/* -------------------------------------------------------------------------- */
/*                          one: the pitch fills up                           */
/* -------------------------------------------------------------------------- */

/* Whoever turns up, in the colour of the area they turned up from. */
const ARRIVING = [
  { left: "24%", top: "34%", area: "dev", delay: "0s" },
  { left: "50%", top: "24%", area: "design", delay: "0.4s" },
  { left: "76%", top: "34%", area: "data", delay: "0.8s" },
  { left: "32%", top: "62%", area: "sales", delay: "1.2s" },
  { left: "68%", top: "62%", area: "product", delay: "1.6s" },
  { left: "50%", top: "76%", area: "marketing", delay: "2s" },
];

export function SceneLineup() {
  return (
    <Stage>
      <Lines />

      {ARRIVING.map((spot) => (
        <Token
          key={spot.left + spot.top}
          colour={getArea(spot.area).color}
          className="tour-arrive size-8 md:size-10"
          style={{ left: spot.left, top: spot.top, animationDelay: spot.delay }}
        />
      ))}
    </Stage>
  );
}

/** A player as the pitch draws one: a ring in the colour of their area. */
function Token({
  colour,
  className,
  style,
}: {
  colour: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
        className,
      )}
      style={{
        borderColor: colour,
        backgroundColor: `color-mix(in oklab, ${colour} 20%, black)`,
        ...style,
      }}
    >
      <span
        className="absolute inset-[15%] rounded-full"
        style={{ backgroundColor: `${colour}33` }}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                         two: the sides get drawn                           */
/* -------------------------------------------------------------------------- */

const SIDES = [TEAM_NAMES[0], TEAM_NAMES[2], TEAM_NAMES[4]];

/*
 * Eight who turned up, where they are standing and which side they end up on.
 * The order inside each side is the order they appear in the sheet, so the
 * colours running down the two cards are the colours scattered on the grass.
 */
const SQUAD = [
  { left: "20%", top: "28%", area: "dev", side: 0 },
  { left: "44%", top: "20%", area: "design", side: 1 },
  { left: "72%", top: "26%", area: "data", side: 0 },
  { left: "86%", top: "48%", area: "sales", side: 1 },
  { left: "14%", top: "56%", area: "product", side: 1 },
  { left: "38%", top: "50%", area: "marketing", side: 0 },
  { left: "62%", top: "62%", area: "finance", side: 1 },
  { left: "30%", top: "78%", area: "it", side: 0 },
];

export function SceneTeams() {
  const { t } = useLocale();

  /*
   * The eight of them standing about on the grass, the button, and then the
   * sheet that comes up over it with the sides already drawn -- which is the
   * whole of what the app does here, in the order it happens.
   */
  return (
    <Stage>
      <span className="tour-behind absolute inset-0">
        <Lines />

        {SQUAD.map((spot) => (
          <Token
            key={spot.area}
            colour={getArea(spot.area).color}
            className="size-7 md:size-8"
            style={{ left: spot.left, top: spot.top }}
          />
        ))}

        {/* The button that does it, the same one the pitch has. */}
        <span className="tour-press absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-xs uppercase tracking-[0.08em] text-primary-foreground">
          <Icon icon={UserGroupIcon} size={14} />
          {t.pitch.drawTeams}
        </span>

        <Cursor className="tour-cursor-draw" />
      </span>

      {/* And what comes back: two sides, every shirt already handed out. */}
      <span className="tour-sheet absolute left-1/2 top-1/2 grid w-[84%] -translate-x-1/2 -translate-y-1/2 grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-background/95 p-2 backdrop-blur-sm">
        {SIDES.slice(0, 2).map((side, index) => (
          <span
            key={side.name}
            className="flex min-w-0 flex-col gap-1.5 rounded-xl border p-2"
            style={{
              borderColor: `${side.accent}44`,
              backgroundColor: `color-mix(in oklab, ${side.accent} 10%, var(--background))`,
            }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="grid size-5 shrink-0 place-items-center rounded font-display text-[0.5rem]"
                style={{
                  color: side.accent,
                  backgroundColor: `${side.accent}26`,
                }}
              >
                {side.badge}
              </span>
              <span
                className="h-1.5 w-14 rounded"
                style={{ backgroundColor: `${side.accent}99` }}
              />
            </span>

            {SQUAD.filter((spot) => spot.side === index).map((spot, row) => (
              <span
                key={spot.area}
                className="tour-slot flex items-center gap-1.5"
                style={{ animationDelay: `${row * 0.07}s` }}
              >
                <span
                  className="size-4 shrink-0 rounded-full border"
                  style={{
                    borderColor: getArea(spot.area).color,
                    backgroundColor: `color-mix(in oklab, ${getArea(spot.area).color} 25%, black)`,
                  }}
                />
                <span className="h-1.5 min-w-0 flex-1 rounded bg-white/25" />
              </span>
            ))}
          </span>
        ))}
      </span>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/*                        three: a card being filled in                       */
/* -------------------------------------------------------------------------- */

/* The same six a profile carries, in the reader's language. */
const SKILLS = [
  { id: "pace", value: 82, delay: "0s" },
  { id: "stamina", value: 64, delay: "0.12s" },
  { id: "finishing", value: 91, delay: "0.24s" },
  { id: "passing", value: 55, delay: "0.36s" },
  { id: "defending", value: 40, delay: "0.48s" },
  { id: "goalkeeping", value: 30, delay: "0.6s" },
];

export function SceneProfile() {
  const { t } = useLocale();

  return (
    <Stage className="grid place-items-center">
      <div className="w-full max-w-xs">
        <div className="flex items-center gap-3">
          <span className="tour-pulse size-14 shrink-0 rounded-full border-2 border-primary bg-black/60" />
          <span className="min-w-0 flex-1">
            <span className="tour-type block h-4 rounded bg-white/70" />
            <span className="mt-2 block h-3 w-20 rounded bg-primary/70" />
          </span>
          <span className="font-display text-3xl tabular-nums text-primary">
            4.1
          </span>
        </div>

        <ul className="mt-5 space-y-2">
          {SKILLS.map((skill) => (
            <li key={skill.id} className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-display text-[0.6875rem] uppercase tracking-widest text-muted-foreground">
                {skillLabel(t, skill.id)}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="tour-fill block h-full rounded-full bg-primary"
                  style={
                    {
                      animationDelay: skill.delay,
                      "--to": `${skill.value}%`,
                    } as React.CSSProperties
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/*                      four: the money, marked off                           */
/* -------------------------------------------------------------------------- */

const OWING = [0, 1, 2, 3];

export function SceneMoney() {
  const { t } = useLocale();

  return (
    <Stage className="grid place-items-center p-4">
      <div className="w-full max-w-xs">
        <p className="text-center font-display text-3xl tabular-nums">
          S/ 17.50
        </p>
        <p className="mt-0.5 text-center font-display text-[0.625rem] uppercase tracking-[0.24em] text-muted-foreground">
          {t.common.each}
        </p>

        <ul className="mt-4 space-y-2">
          {OWING.map((row) => (
            <li key={row} className="flex items-center gap-3">
              <span className="size-7 shrink-0 rounded-full bg-white/10" />
              <span className="h-2.5 flex-1 rounded bg-white/10" />
              <span
                className="tour-settle grid size-6 shrink-0 place-items-center rounded-full text-[0.5625rem] font-semibold text-white"
                style={{ animationDelay: `${row * 0.5}s` }}
              >
                S/
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/*                     five: the shout, on a double tap                       */
/* -------------------------------------------------------------------------- */

export function SceneGoal() {
  const { t } = useLocale();

  return (
    <Stage className="grid place-items-center overflow-hidden">
      {/* The row being double tapped, which is how a goal is entered. */}
      <div className="tour-row-out flex w-full max-w-xs items-center gap-3 rounded-xl px-3 py-2">
        <span className="size-9 shrink-0 rounded-full border-2 border-primary bg-black/60" />
        <span className="min-w-0 flex-1">
          <span className="block h-3.5 w-28 rounded bg-white/70" />
          <span className="mt-1.5 block h-2.5 w-16 rounded bg-primary/60" />
        </span>
        <Icon icon={FootballIcon} size={16} className="text-primary" />
      </div>

      <Cursor className="tour-cursor-tap" />

      {/* And the shout it sets off, over everything. */}
      <span
        className="tour-shout pointer-events-none absolute inset-0 grid place-items-center text-[clamp(3rem,10vw,5rem)] uppercase leading-none text-primary"
        style={{ fontFamily: "var(--font-scoreboard)" }}
      >
        <span className="-rotate-[10deg]">{t.common.goal}</span>
      </span>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/*                    six: winner stays, the table keeps up                    */
/* -------------------------------------------------------------------------- */

export function SceneRotation() {
  return (
    <Stage className="grid place-items-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-4">
          {[0, 1, 2].map((side) => (
            <span
              key={side}
              className="tour-bench grid size-14 place-items-center rounded-2xl border-2 font-display text-lg"
              style={{
                animationDelay: `${side * 1.4}s`,
                borderColor: SIDES[side].accent,
                color: SIDES[side].accent,
                backgroundColor: `color-mix(in oklab, ${SIDES[side].accent} 16%, var(--background))`,
              }}
            >
              {SIDES[side].badge}
            </span>
          ))}
        </div>

        <ul className="mt-6 space-y-2">
          {[7, 4, 1].map((points, row) => (
            <li key={points} className="flex items-center gap-3 text-sm">
              <span
                className="size-5 shrink-0 rounded"
                style={{ backgroundColor: SIDES[row].accent }}
              />
              <span className="h-2.5 flex-1 rounded bg-white/10" />
              <span
                className="tour-count w-6 text-right font-display tabular-nums"
                style={{ animationDelay: `${row * 0.3}s` }}
              >
                {points}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/*                    seven: the card, out to the group chat                   */
/* -------------------------------------------------------------------------- */

export function SceneShare() {
  return (
    <Stage className="grid place-items-center">
      <div className="relative w-full max-w-[16rem]">
        <div className="tour-send rounded-2xl border border-white/15 bg-black/70 p-4">
          <span className="block h-3.5 w-32 rounded bg-white/70" />
          <span className="mt-2 block h-2.5 w-40 rounded bg-white/20" />

          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <li key={row} className="h-2 rounded bg-white/12" />
            ))}
          </ul>

          <span className="mt-3 block h-2.5 w-24 rounded bg-primary/70" />
        </div>

        {/* The chat it lands in. */}
        <span className="tour-bubble absolute -bottom-2 right-0 rounded-2xl rounded-br-sm bg-primary px-3 py-2 font-display text-xs uppercase tracking-widest text-primary-foreground">
          WhatsApp
        </span>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/*                       eight: the season adds itself up                      */
/* -------------------------------------------------------------------------- */

const PODIUM = [
  {
    name: "Diego",
    colour: "#c9d4e2",
    size: "size-9",
    pad: "pt-4",
    goals: 8,
    delay: "0.4s",
  },
  {
    name: "Maximo",
    colour: "#f2c53d",
    size: "size-12",
    pad: "pt-2",
    goals: 11,
    delay: "0s",
  },
  {
    name: "Luis",
    colour: "#c2814c",
    size: "size-8",
    pad: "pt-5",
    goals: 7,
    delay: "0.8s",
  },
];

/** Three rows that keep changing places, because the goals keep coming. */
const TABLE_ROWS = [
  { name: "Marco", colour: "#38bdf8", goals: 6, points: 22, rank: 1 },
  { name: "Emilio", colour: "#f472b6", goals: 6, points: 19, rank: 2 },
  { name: "Alfredo", colour: "#4ade80", goals: 5, points: 20, rank: 3 },
];

export function ScenePodium() {
  /*
   * The season, the way the drawer actually shows it: three on a podium and
   * the rest in a table underneath -- where the rows change places as the
   * goals go in, which is the whole reason anybody opens it twice.
   */
  return (
    <Stage className="aspect-auto p-1">
      <div className="flex flex-col justify-center gap-4">
        <ol className="flex items-end justify-center gap-2">
          {PODIUM.map((step) => (
            <li
              key={step.name}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 pb-2 text-center",
                step.pad,
              )}
              style={{
                background: `linear-gradient(180deg, ${step.colour}33 0%, ${step.colour}0f 55%, rgba(255,255,255,0.04) 100%)`,
              }}
            >
              <span
                className="absolute right-1.5 top-1.5"
                style={{ color: step.colour }}
              >
                <Icon icon={ChampionIcon} size={14} strokeWidth={1.4} />
              </span>

              <span
                className={cn("rounded-full border-2 bg-black/40", step.size)}
                style={{ borderColor: step.colour }}
              />
              <span className="text-[0.6875rem] font-semibold leading-none">
                {step.name}
              </span>
              <span className="flex items-center gap-1 font-display text-[0.625rem] tabular-nums text-muted-foreground">
                <Icon icon={FootballIcon} size={10} className="text-primary" />
                <span
                  className="tour-tick"
                  style={{ animationDelay: step.delay }}
                >
                  {step.goals}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {/* And the table, where fourth and fifth keep trading places. */}
        <div className="relative h-[8rem]">
          {TABLE_ROWS.map((row) => (
            <span
              key={row.name}
              className={cn(
                "absolute inset-x-0 flex items-center gap-2 rounded-lg px-2 py-1.5",
                `tour-rank-${row.rank}`,
              )}
            >
              <span className="w-3 shrink-0 text-right font-display text-[0.625rem] tabular-nums text-muted-foreground">
                {row.rank + 3}
              </span>
              <span
                className="size-6 shrink-0 rounded-full border bg-black/40"
                style={{ borderColor: row.colour }}
              />
              <span className="min-w-0 flex-1">
                <span className="block h-2 w-24 max-w-full rounded bg-white/45" />
                <span className="mt-1 block h-1.5 w-12 rounded bg-white/15" />
              </span>
              <span className="flex items-center gap-1 font-display text-[0.6875rem] tabular-nums">
                <Icon icon={FootballIcon} size={10} className="text-primary" />
                {row.goals}
              </span>
              <span className="w-6 text-right font-display text-[0.6875rem] font-semibold tabular-nums">
                {row.points}
              </span>
            </span>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------------------------- */
/*                                the scenery                                  */
/* -------------------------------------------------------------------------- */

function Stage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The markings, so a pitch reads as a pitch and not as a dark rectangle. */
function Lines() {
  return (
    <span aria-hidden className="absolute inset-0">
      <span className="absolute inset-x-6 inset-y-4 rounded-xl border border-white/12" />
      <span className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
      <span className="absolute inset-x-6 top-1/2 h-px bg-white/12" />
      <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25" />
      <span className="absolute left-1/2 top-4 h-10 w-24 -translate-x-1/2 rounded-b-lg border border-t-0 border-white/12" />
      <span className="absolute bottom-4 left-1/2 h-10 w-24 -translate-x-1/2 rounded-t-lg border border-b-0 border-white/12" />
    </span>
  );
}

/** A hand, so a press reads as a press. */
function Cursor({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      style={{ color: LIME }}
    >
      <svg viewBox="0 0 24 24" className="size-7 drop-shadow-lg">
        <path
          d="M5 3l14 8-6 1.5L10 19z"
          fill="white"
          stroke="black"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
