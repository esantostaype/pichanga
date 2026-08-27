import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Guards the API.
 *
 * A guest can read everything and fully manage *players* and the *lineup*:
 * that is the part of the app the whole office touches. Matches and places are
 * the fixture itself, so creating or changing them needs the admin session.
 *
 * In Next 16 this file convention is `proxy`, not `middleware`.
 */
const GUEST_WRITES: Array<{ method: string; pattern: RegExp }> = [
  // Player profiles, end to end.
  { method: "POST", pattern: /^\/api\/players\/?$/ },
  { method: "PATCH", pattern: /^\/api\/players\/[^/]+\/?$/ },
  { method: "DELETE", pattern: /^\/api\/players\/[^/]+\/?$/ },
  // The photo that goes with a profile.
  { method: "POST", pattern: /^\/api\/upload\/?$/ },
  // Putting players on the pitch and taking them off. The trailing segment is
  // what separates this from deleting the match itself.
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/players\/?$/ },
  { method: "DELETE", pattern: /^\/api\/matches\/[^/]+\/players\/[^/]+\/?$/ },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages are public: a guest still sees the pitch and the lineup.
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Logging in and out cannot require being logged in.
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const isRead = request.method === "GET" || request.method === "HEAD";

  // The venue autocomplete is a read, but every call costs money on the
  // Google bill, so it stays behind the session.
  const isBilledSearch = pathname.startsWith("/api/places/search");

  if (isRead && !isBilledSearch) return NextResponse.next();

  const isGuestWrite = GUEST_WRITES.some(
    (rule) => rule.method === request.method && rule.pattern.test(pathname),
  );
  if (isGuestWrite) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  return NextResponse.json(
    { error: "You need to sign in to do that" },
    { status: 401 },
  );
}

export const config = {
  matcher: "/api/:path*",
};
