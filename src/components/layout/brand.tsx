import Link from "next/link";

/**
 * The logo, and the way back to the current match.
 *
 * On a pinned date (`/match/sep-2-2026`) this is the only route home, so it is
 * a link everywhere rather than only there.
 */
export function Brand() {
  return (
    <Link
      href="/"
      aria-label="Pichanga, current match"
      className="flex shrink-0 flex-col gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo.svg" alt="Pichanga" className="w-36 md:w-50" />
    </Link>
  );
}
