import { notFound } from "next/navigation";

import { LiveScreen } from "@/components/live/live-screen";
import { loadScreenState } from "@/components/layout/match-screen";
import { SetupNotice } from "@/components/layout/setup-notice";
import { PichangaProvider } from "@/components/providers/pichanga-provider";
import { getMatchLive } from "@/db/queries";
import { getDictionary } from "@/i18n/server";
import { getRole } from "@/lib/session";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/** The tab follows the language cookie like every other page. */
export async function generateMetadata() {
  const t = await getDictionary();

  return {
    title: `Demo ${t.hud.live} - ${SITE.name}`,
    robots: { index: false },
  };
}

/** Match night in the sandbox. The same screen, over the demo's own match. */
export default async function DemoLivePage() {
  if (!(await getRole())) notFound();

  const state = await loadScreenState(undefined, true);

  if ("missing" in state) notFound();
  if ("error" in state) return <SetupNotice detail={state.error} />;

  const match = state.data.nextMatch;
  if (!match) notFound();

  const live = await getMatchLive(match.id);

  return (
    <PichangaProvider initial={state.data}>
      <LiveScreen match={match} backHref="/demo" initial={live} />
    </PichangaProvider>
  );
}
