import { notFound } from "next/navigation";

import { loadScreenState } from "@/components/layout/match-screen";
import { SetupNotice } from "@/components/layout/setup-notice";
import { NightResults } from "@/components/live/night-results";
import { PichangaProvider } from "@/components/providers/pichanga-provider";
import { getMatchLive } from "@/db/queries";
import { getDictionary } from "@/i18n/server";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getDictionary();

  return {
    title: `Demo · ${t.results.title} - ${SITE.name}`,
    robots: { index: false },
  };
}

/** The podium and the pot, in the sandbox. */
export default async function DemoResultsPage() {
  const state = await loadScreenState(undefined, true);

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
        backHref="/demo"
        liveHref="/demo/live"
      />
    </PichangaProvider>
  );
}
