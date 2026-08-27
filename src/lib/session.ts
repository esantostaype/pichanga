import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  isAuthConfigured,
  verifySessionToken,
  type Role,
} from "./auth";

/** Reads the session role on the server, for the first render. */
export async function getRole(): Promise<Role | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** A super admin is an admin too: the role only adds. */
export async function getIsSuperAdmin(): Promise<boolean> {
  return (await getRole()) === "superadmin";
}

export { isAuthConfigured };
