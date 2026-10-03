import { notFound } from "next/navigation";

import { loadScreenState } from "@/components/layout/match-screen";
import { SetupNotice } from "@/components/layout/setup-notice";
import { NightResults } from "@/components/live/night-results";
import { PichangaProvider } from "@/components/providers/pichanga-provider";
import { getMatchLive } from "@/db/queries";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatShortDate } from "@/lib/date";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [state, locale, t] = await Promise.all([
    loadScreenState(slug),
    getLocale(),
    getDictionary(),
  ]);

  return {
    title:
      "data" in state && state.data.nextMatch
        ? `${t.results.title} · ${formatShortDate(state.data.nextMatch.playedAt, locale)} - ${SITE.name}`
        : SITE.title,
  };
}

/**
 * The podium and the pot for one night, on its own address.
 *
 * Only for a night with sides drawn: without teams there is no table, and no
 * table means nothing to put on a podium.
 */
export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  const state = await loadScreenState(slug);

  if ("missing" in state) notFound();
  if ("error" in state) return <SetupNotice detail={state.error} />;

  const match = state.data.nextMatch;
  if (!match || match.teams.length < 2) notFound();

  const live = await getMatchLive(match.id);

  return (
    <PichangaProvider initial={state.data}>
      <NightResults
        match={match}
        initial={live}
        backHref={`/match/${slug}`}
        liveHref={`/match/${slug}/live`}
      />
    </PichangaProvider>
  );
}
