import { badgeFor } from "@/lib/teams";
import { cn } from "@/lib/utils";

/** El escudo, en la caja de 48x56 donde se dibuja cada uno. */
export const SHIELD_PATH = "M24 1 46 8v22c0 12-9 20-22 25C11 50 2 42 2 30V8Z";

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
 *
 * Un equipo armado a mano puede elegir sus propias dos letras, o una imagen.
 * La imagen va sola, entera y sin escudo alrededor: es el escudo propio del
 * equipo, y recortarlo al nuestro cortaría la mitad de casi cualquier logo.
 * Ocupa la misma caja que el escudo, así que cambiar uno por otro no mueve
 * nada de lo que está al lado.
 */
export function TeamCrest({
  name,
  accent,
  badge,
  image,
  size = 40,
  className,
}: {
  name: string;
  accent: string;
  /** Letras elegidas a mano; si no hay, se sacan del nombre. */
  badge?: string | null;
  /** Una imagen en lugar de las letras. */
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const letters = badge || badgeFor(name);

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={`${name} crest`}
        width={size}
        height={(size / 48) * 56}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: (size / 48) * 56 }}
      />
    );
  }

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
        d={SHIELD_PATH}
        fill={accent}
        fillOpacity={0.16}
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/*
        No `dominant-baseline`: the baseline is put where the capitals end up
        straddling the middle of the shield, which is the same in every
        browser and does not depend on the font's own idea of a centre.
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
        {letters}
      </text>
    </svg>
  );
}
