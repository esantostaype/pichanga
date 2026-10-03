import { MatchScreen } from "@/components/layout/match-screen";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Demo - ${SITE.name}`,
  robots: { index: false },
};

/**
 * The whole app, over rows nobody plays on.
 *
 * Not a mock and not a copy: the same screen, the same provider and the same
 * endpoints, reading and writing rows marked as the sandbox's. Players can be
 * added and deleted, an organizer picked, the teams drawn and the night played
 * out, and none of it touches a real fixture -- which is the only way to try
 * any of it without waiting for Wednesday.
 *
 * Open to everybody, password or not: it is where somebody who has never seen
 * the app gets to press every button. The edits a guest cannot make on the real
 * fixture are allowed here because they can only reach sandbox rows -- see
 * `isDemoWrite`.
 */
export default async function DemoPage() {
  return <MatchScreen demo />;
}
