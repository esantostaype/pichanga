import { notFound } from "next/navigation";

import { MatchScreen } from "@/components/layout/match-screen";
import { getRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Demo - Pichanga", robots: { index: false } };

/**
 * The whole app, over rows nobody plays on.
 *
 * Not a mock and not a copy: the same screen, the same provider and the same
 * endpoints, reading and writing rows marked as the sandbox's. Players can be
 * added and deleted, an organizer picked, the teams drawn and the night played
 * out, and none of it touches a real fixture -- which is the only way to try
 * any of it without waiting for Wednesday.
 *
 * Behind the session, and a 404 rather than a redirect for everyone else: a
 * page nobody should be poking at is better off looking like it does not exist.
 */
export default async function DemoPage() {
  if (!(await getRole())) notFound();

  return <MatchScreen demo />;
}
