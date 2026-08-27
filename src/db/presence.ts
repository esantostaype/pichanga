import "server-only";

import { eq, gt, lt, sql } from "drizzle-orm";

import { PRESENCE } from "@/lib/constants";
import { db } from "./index";
import { visitors } from "./schema";

/**
 * Live headcount, kept in our own table rather than in the realtime provider.
 *
 * That keeps the number on the server: it is only ever read by the route the
 * super admin is allowed to call, instead of being pushed to every screen the
 * way a presence channel would.
 */

/** One open tab saying "still here". */
export async function recordVisit(id: string, now = Date.now()) {
  const lastSeen = new Date(now);

  await db
    .insert(visitors)
    .values({ id, lastSeen })
    .onConflictDoUpdate({ target: visitors.id, set: { lastSeen } });
}

/** A tab closing. Keeps the count honest without waiting for the window. */
export async function forgetVisit(id: string) {
  await db.delete(visitors).where(eq(visitors.id, id));
}

/** How many tabs have the app open right now. */
export async function countLiveVisitors(now = Date.now()) {
  // Swept on read: the sweep is indexed and only the super admin triggers it,
  // so the table stays the size of the crowd instead of growing forever.
  await db
    .delete(visitors)
    .where(lt(visitors.lastSeen, new Date(now - PRESENCE.staleMs)));

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(visitors)
    .where(gt(visitors.lastSeen, new Date(now - PRESENCE.windowMs)));

  return row?.count ?? 0;
}
