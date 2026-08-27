import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE, isAuthConfigured, verifySessionToken } from "./auth";

/** Reads the admin session on the server, for the first render. */
export async function getIsAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export { isAuthConfigured };
