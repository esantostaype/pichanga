import { resetDemo } from "@/db/queries";
import { json, route } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Wipes the sandbox and builds a fresh one.
 *
 * Behind the session, like the demo screen itself. It is destructive by design
 * -- that is what a sandbox is for -- and it can only reach rows marked as the
 * demo's, so there is nothing real for it to take with it.
 */
export async function POST() {
  return route(async () => json(await resetDemo()));
}
