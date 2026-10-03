import { eq } from "drizzle-orm";

import { db } from "./index";
import { matches, venues } from "./schema";

/**
 * Whether an admin-only write only touches the sandbox, so a guest may make it.
 *
 * The demo is open to everybody and is meant to be tried end to end --
 * creating a match, editing the venue, drawing the sides, resetting the lot --
 * which are the writes the real app keeps behind the password. They are let
 * through here only when the row they land on is marked as the demo's, looked
 * up in the database rather than taken from the request, so asking for it is
 * not enough: a real match or venue still needs the session.
 *
 * Creating is the one case with no row yet. Those are allowed when the body
 * asks for a sandbox row, which is all the new row can then be.
 */
export async function isDemoWrite(request: Request, pathname: string) {
  if (request.method === "POST" && /^\/api\/demo\/reset\/?$/.test(pathname)) {
    return true;
  }

  const match = /^\/api\/matches\/([^/]+)(?:\/|$)/.exec(pathname);
  if (match && match[1] !== "next") {
    const [row] = await db
      .select({ isDemo: matches.isDemo })
      .from(matches)
      .where(eq(matches.id, decodeURIComponent(match[1])));
    return row?.isDemo === true;
  }

  const venue = /^\/api\/venues\/([^/]+)\/?$/.exec(pathname);
  if (venue) {
    const [row] = await db
      .select({ isDemo: venues.isDemo })
      .from(venues)
      .where(eq(venues.id, decodeURIComponent(venue[1])));
    return row?.isDemo === true;
  }

  if (
    request.method === "POST" &&
    /^\/api\/(matches|venues)\/?$/.test(pathname)
  ) {
    try {
      const body = (await request.clone().json()) as { isDemo?: unknown };
      return body?.isDemo === true;
    } catch {
      return false;
    }
  }

  return false;
}
