import type { Metadata } from "next";

import { MatchScreen } from "@/components/layout/match-screen";
import { getMatchBySlug } from "@/db/queries";
import { formatShortDate } from "@/lib/date";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const match = await getMatchBySlug(slug);

  // The layout supplies the rest of the metadata; only the title changes.
  return {
    title: match
      ? `${formatShortDate(match.playedAt)} - ${SITE.name}`
      : SITE.title,
  };
}

/** One date, by its readable address: `/match/sep-2-2026`. */
export default async function MatchPage({ params }: Props) {
  const { slug } = await params;
  return <MatchScreen slug={slug} />;
}
