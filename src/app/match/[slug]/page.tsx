import type { Metadata } from "next";

import { MatchScreen } from "@/components/layout/match-screen";
import { getMatchBySlug } from "@/db/queries";
import { getLocale } from "@/i18n/server";
import { formatShortDate } from "@/lib/date";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [match, locale] = await Promise.all([
    getMatchBySlug(slug),
    getLocale(),
  ]);

  // The layout supplies the rest of the metadata; only the title changes.
  return {
    title: match
      ? `${formatShortDate(match.playedAt, locale)} - ${SITE.name}`
      : SITE.title,
  };
}

/** One date, by its readable address: `/match/sep-2-2026`. */
export default async function MatchPage({ params }: Props) {
  const { slug } = await params;
  return <MatchScreen slug={slug} />;
}
