import { TEAM_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * A team's badge: a shield in the team's colour with its short form on it.
 *
 * Drawn rather than drawn *by hand*. Fourteen names in the pool and more to
 * come, each needing a crest in two sizes and both themes -- as artwork that is
 * fourteen files to keep in step with a list in a constants file. As a shape
 * plus a colour plus two letters, a new name arrives with its crest already
 * made.
 *
 * Two letters at most, in the app's display face: a shield is read from the
 * touchline at the size of a thumbnail, and three characters in it are a word
 * nobody can make out.
 */
export function TeamCrest({
  name,
  accent,
  size = 40,
  className,
}: {
  name: string;
  accent: string;
  size?: number;
  className?: string;
}) {
  const badge = badgeFor(name);

  return (
    <svg
      viewBox="0 0 48 56"
      width={size}
      height={(size / 48) * 56}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={`${name} crest`}
    >
      <path
        d="M24 1 46 8v22c0 12-9 20-22 25C11 50 2 42 2 30V8Z"
        fill={accent}
        fillOpacity={0.16}
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/*
        No stripe across it any more: it was there to stop the shield reading
        as a sticker with letters on it, and the letters do that themselves
        once they are the scoreboard face and big enough to fill the shield.
      */}
      {/*
        No `dominant-baseline`: the baseline is put where the capitals end up
        straddling the middle of the shield, which is the same in every browser
        and does not depend on the font's own idea of a centre.
      */}
      <text
        x="24"
        y="35"
        textAnchor="middle"
        fill={accent}
        fontSize={28}
        fontWeight={700}
        letterSpacing={1.5}
        fontFamily="var(--font-display), system-ui, sans-serif"
      >
        {badge}
      </text>
    </svg>
  );
}

/**
 * The short form for a name.
 *
 * Taken from the pool when the name is in it, so `Los 404` reads `404` rather
 * than `L4`. A name from outside the pool -- an older match, a rename -- falls
 * back to its initials, which is never wrong even when it is dull.
 */
function badgeFor(name: string) {
  const known = TEAM_NAMES.find((team) => team.name === name);
  if (known) return known.badge;

  return name
    .split(/\s+/)
    .filter((word) => !/^(los|las|the|fc)$/i.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}
