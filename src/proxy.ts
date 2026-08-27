import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Guards the API. Anyone can read and can do the two things a guest is meant
 * to do at a match: sign a new player up and add players to the lineup.
 * Everything else needs the admin session cookie.
 *
 * In Next 16 this file convention is `proxy`, not `middleware`.
 */
const GUEST_WRITES: Array<{ method: string; pattern: RegExp }> = [
  // Create a player profile...
  { method: "POST", pattern: /^\/api\/players\/?$/ },
  // ...including its photo,
  { method: "POST", pattern: /^\/api\/upload\/?$/ },
  // ...and put players on the current match.
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/players\/?$/ },
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
