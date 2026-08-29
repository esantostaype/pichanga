import { notFound } from "next/navigation";

import { LiveScreen } from "@/components/live/live-screen";
import { loadScreenState } from "@/components/layout/match-screen";
import { SetupNotice } from "@/components/layout/setup-notice";
import { PichangaProvider } from "@/components/providers/pichanga-provider";
import { getMatchLive } from "@/db/queries";
import { formatShortDate } from "@/lib/date";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const state = await loadScreenState(slug);

  return {
    title:
      "data" in state && state.data.nextMatch
        ? `${formatShortDate(state.data.nextMatch.playedAt)} live - ${SITE.name}`
        : SITE.title,
  };
}

/**
 * Match night, on its own address.
 *
 * Kept apart from the lineup on purpose: the two screens want the same gestures
 * for different things, and a page that means "they paid" on Tuesday and "they
 * scored" on Thursday is a page nobody can trust in a hurry.
 *
 * It carries the same provider as the lineup all the same, so the menu, the
 * album and the share sheet are the ones people already know rather than a
 * second set that happens to look alike.
 */
export default async function LivePage({ params }: Props) {
  const { slug } = await params;
  const state = await loadScreenState(slug);

  if ("missing" in state) notFound();
  if ("error" in state) return <SetupNotice detail={state.error} />;

  const match = state.data.nextMatch;
  if (!match) notFound();

  const live = await getMatchLive(match.id);

  return (
    <PichangaProvider initial={state.data}>
      <LiveScreen
        match={match}
        backHref={`/match/${slug}`}
        initial={live}
      />
    </PichangaProvider>
  );
}
