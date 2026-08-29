"use client";

import Link from "next/link";

import { usePichanga } from "@/components/providers/pichanga-provider";

/**
 * The logo, and the way back to the current match.
 *
 * On a pinned date (`/match/sep-2-2026`) this is the only route home. On the
 * front page it is just the logo: a link to the page you are already looking at
 * would play the whole transition to arrive where you started.
 */
export function Brand() {
  const { pinnedMatchId } = usePichanga();

  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/images/logo.svg" alt="Pichanga" className="w-36 md:w-50" />
  );

  if (!pinnedMatchId) {
    return <div className="flex shrink-0 flex-col gap-1">{mark}</div>;
  }

  return (
    <Link
      href="/"
      aria-label="Pichanga, current match"
      className="flex shrink-0 cursor-pointer flex-col gap-1 rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {mark}
    </Link>
  );
}
