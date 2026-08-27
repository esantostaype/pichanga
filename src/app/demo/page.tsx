import { notFound } from "next/navigation";

import { DemoShare } from "@/components/matches/demo-share";
import { getRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Demo - Pichanga", robots: { index: false } };

/**
 * A permanent fixture for trying the share card: twenty-four players, photos,
 * a priced venue and a half-settled rental, none of it in the database.
 *
 * Behind the session, and a 404 rather than a redirect for everyone else: a
 * page nobody should be poking at is better off looking like it does not exist.
 */
export default async function DemoPage() {
  if (!(await getRole())) notFound();

  return <DemoShare />;
}
