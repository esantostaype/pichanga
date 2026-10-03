import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import webpush from "web-push";

import { DICTIONARIES, fill } from "@/i18n/dictionaries";
import { DEFAULT_LOCALE } from "@/i18n/locale";
import { gameScore } from "@/lib/live";
import { SITE } from "@/lib/site";
import type { Match, MatchLive } from "@/types";

/**
 * Notifications that reach a locked phone.
 *
 * A page cannot do it on its own -- a locked phone freezes it -- so the end of
 * a game is pushed from here, through the browser's push service, to every
 * phone following that match. The moment comes from QStash (Upstash): when a
 * game kicks off, a message is scheduled to call back at the second its clock
 * runs out, because this server has no timers of its own.
 *
 * Every piece is optional. Without the VAPID keys nothing is pushed; without
 * QStash nothing is scheduled, and the end of a game is only pushed when
 * somebody ends it by hand. The app works the same either way.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:pichanga@example.com";

export const pushConfigured = () => !!VAPID_PUBLIC && !!VAPID_PRIVATE;

let ready = false;
function vapid() {
  if (!ready && VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    ready = true;
  }
  return ready;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushMessage = {
  title: string;
  body: string;
  /** One per game, so two pushes for the same whistle replace each other. */
  tag: string;
  url: string;
};

/**
 * Sends one message to every phone given. Hands back the ones the push
 * service says are gone for good (uninstalled, permission revoked), so the
 * caller can forget them.
 */
export async function sendPush(targets: PushTarget[], message: PushMessage) {
  if (!vapid() || targets.length === 0) return [];

  const gone: string[] = [];

  await Promise.all(
    targets.map(async (target) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          JSON.stringify(message),
          // A whistle an hour late is noise: drop it rather than deliver it.
          { TTL: 10 * 60, urgency: "high" },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(target.endpoint);
        else console.error("[push] could not send", status ?? error);
      }
    }),
  );

  return gone;
}

/** Where the night is played, for a notification to open. */
export const livePath = (match: Pick<Match, "isDemo" | "playedAt">, slug: string) =>
  match.isDemo ? "/demo/live" : `/match/${slug}/live`;

/**
 * The words for a game that has just ended, in the app's own language: a push
 * goes out to phones nobody knows the language of.
 */
export function fullTimeMessage(
  match: Match,
  live: MatchLive,
  gameId: string,
  url: string,
): PushMessage | null {
  const game = live.games.find((one) => one.id === gameId);
  if (!game || game.endedAt === null) return null;

  const t = DICTIONARIES[DEFAULT_LOCALE];
  const score = gameScore(live.goals, game);
  const name = (id: string) =>
    match.teams.find((team) => team.id === id)?.name ?? "";

  return {
    title: fill(t.live.fullTimeTitle, { number: game.slot + 1 }),
    body: fill(t.live.fullTimeBody, {
      home: name(game.homeTeamId),
      away: name(game.awayTeamId),
      homeGoals: score.home,
      awayGoals: score.away,
    }),
    tag: `full-time-${game.id}`,
    url,
  };
}

/* -------------------------------- QStash -------------------------------- */

const QSTASH_URL = process.env.QSTASH_URL || "https://qstash.upstash.io";

/**
 * Asks QStash to call back when a game's clock runs out.
 *
 * Fire and forget: a failure here costs the push and nothing else, so it is
 * logged rather than thrown into the kick-off it rides along with.
 */
export async function scheduleFullTime(
  matchId: string,
  gameId: string,
  delaySeconds: number,
) {
  const token = process.env.QSTASH_TOKEN;
  if (!token || !pushConfigured() || delaySeconds <= 0) return;

  const destination = `${SITE.url}/api/push/full-time`;

  try {
    const response = await fetch(`${QSTASH_URL}/v2/publish/${destination}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Upstash-Delay": `${Math.round(delaySeconds)}s`,
        // One attempt is the point: a whistle retried a minute later is wrong.
        "Upstash-Retries": "1",
      },
      body: JSON.stringify({ matchId, gameId }),
    });

    if (!response.ok) {
      console.error("[push] QStash refused", response.status, await response.text());
    }
  } catch (error) {
    console.error("[push] QStash unreachable", error);
  }
}

const base64url = (input: Buffer) => input.toString("base64url");

/**
 * Whether a callback really came from QStash.
 *
 * QStash signs every request with a JWT in `Upstash-Signature`, keyed with the
 * project's signing keys -- the current one, or the next while they rotate --
 * and carrying a hash of the body, so neither the sender nor the message can
 * be faked. Without the keys configured nothing is accepted.
 */
export function verifyQStash(signature: string | null, rawBody: string) {
  const keys = [
    process.env.QSTASH_CURRENT_SIGNING_KEY,
    process.env.QSTASH_NEXT_SIGNING_KEY,
  ].filter((key): key is string => !!key);

  if (!signature || keys.length === 0) return false;

  const [header, payload, sent] = signature.split(".");
  if (!header || !payload || !sent) return false;

  const signed = keys.some((key) => {
    const expected = createHmac("sha256", key)
      .update(`${header}.${payload}`)
      .digest();
    const given = Buffer.from(sent, "base64url");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!signed) return false;

  let claims: { iss?: string; exp?: number; nbf?: number; body?: string };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== "Upstash") return false;
  if (claims.exp !== undefined && now > claims.exp) return false;
  // A minute of slack for the two clocks disagreeing.
  if (claims.nbf !== undefined && now + 60 < claims.nbf) return false;

  const hash = base64url(createHash("sha256").update(rawBody).digest());
  const strip = (value: string) => value.replace(/=+$/, "");
  return !!claims.body && strip(claims.body) === strip(hash);
}
