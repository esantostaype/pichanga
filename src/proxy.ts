import { NextResponse, type NextRequest } from "next/server";

import { DICTIONARIES } from "@/i18n/dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/locale";
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
  // Drawing the sides, which is the same kind of act as adding a player: it
  // happens two hours before kick-off with everybody standing around, and the
  // endpoint checks that window itself. Clearing them is not here -- undoing
  // somebody's teams is a bigger thing than making them.
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/teams\/?$/ },
  // Who goes in goal, which is the same conversation as the draw and gets
  // settled the same way: out loud, by whoever is standing there.
  {
    method: "POST",
    pattern: /^\/api\/matches\/[^/]+\/teams\/[^/]+\/keeper\/?$/,
  },
  // How long a game runs, which is agreed out loud at the ground with the
  // sides just drawn. The same standing-around as the draw itself.
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/game-length\/?$/ },
  // Match night: starting a game, blowing the whistle on it, and putting the
  // goals up. All of it happens on a pitch with everybody standing around, and
  // whoever has their phone out does it -- including taking a goal back off,
  // because the same finger that mistyped it should be able to fix it.
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/live\/games\/?$/ },
  {
    method: "PATCH",
    pattern: /^\/api\/matches\/[^/]+\/live\/games\/[^/]+\/?$/,
  },
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/live\/goals\/?$/ },
  {
    method: "DELETE",
    pattern: /^\/api\/matches\/[^/]+\/live\/goals\/[^/]+\/?$/,
  },
  // The last whistle: the same hands that keep score end the night.
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/live\/finish\/?$/ },
  // The match gallery: anyone may add a photo or a clip. Deleting one is not
  // here, so it falls through to the session.
  { method: "POST", pattern: /^\/api\/upload\/ticket\/?$/ },
  { method: "POST", pattern: /^\/api\/matches\/[^/]+\/media\/?$/ },
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

/*
 * The words, without `next/headers`.
 *
 * This file runs in the proxy runtime, where `cookies()` does not exist --
 * but the request is right here and it is carrying the same cookie, so the
 * language is one lookup away.
 */
const refusals = (request: NextRequest) => {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  return DICTIONARIES[isLocale(chosen) ? chosen : DEFAULT_LOCALE].api;
};

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
  const role = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (role && allows(role, required)) return NextResponse.next();

  // Signed in but not far enough: say so, instead of asking for a password
  // they already typed.
  const says = refusals(request);

  return role
    ? NextResponse.json({ error: says.superAdminOnly }, { status: 403 })
    : NextResponse.json({ error: says.needSignIn }, { status: 401 });
}

export const config = {
  matcher: "/api/:path*",
};
