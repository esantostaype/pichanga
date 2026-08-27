import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken, type Role } from "@/lib/auth";

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
  // "This tab is open." Anyone visiting is counted, so anyone may say it.
  { method: "POST", pattern: /^\/api\/presence\/?$/ },
];

/** Reads are public unless they are listed here. */
const PROTECTED_READS: Array<{ pattern: RegExp; role: Role }> = [
  // The venue autocomplete is a read, but every call costs money on the
  // Google bill, so it stays behind the session.
  { pattern: /^\/api\/places\/search/, role: "admin" },
  // How many people are on the app is for whoever runs it, nobody else.
  { pattern: /^\/api\/presence\/?$/, role: "superadmin" },
];

/** A super admin passes anywhere an admin does. */
const allows = (role: Role, required: Role) =>
  role === "superadmin" || required === "admin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages are public: a guest still sees the pitch and the lineup.
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Logging in and out cannot require being logged in.
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const isRead = request.method === "GET" || request.method === "HEAD";

  const protectedRead = isRead
    ? PROTECTED_READS.find((rule) => rule.pattern.test(pathname))
    : undefined;

  if (isRead && !protectedRead) return NextResponse.next();

  if (!protectedRead) {
    const isGuestWrite = GUEST_WRITES.some(
      (rule) => rule.method === request.method && rule.pattern.test(pathname),
    );
    if (isGuestWrite) return NextResponse.next();
  }

  const required: Role = protectedRead?.role ?? "admin";
  const role = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (role && allows(role, required)) return NextResponse.next();

  // Signed in but not far enough: say so, instead of asking for a password
  // they already typed.
  return role
    ? NextResponse.json(
        { error: "This is only for the super admin" },
        { status: 403 },
      )
    : NextResponse.json(
        { error: "You need to sign in to do that" },
        { status: 401 },
      );
}

export const config = {
  matcher: "/api/:path*",
};
