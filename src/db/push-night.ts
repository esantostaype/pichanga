import "server-only";

import { matchSlug } from "@/lib/date";
import {
  fullTimeMessage,
  livePath,
  pushConfigured,
  sendPush,
} from "@/lib/push";
import {
  forgetPushSubscriptions,
  getMatch,
  getMatchLive,
  pushTargetsFor,
} from "./queries";

/**
 * Tells every phone following a match that one of its games has ended.
 *
 * Sent by whoever blows the whistle -- a thumb, or QStash at the minute the
 * clock runs out. Both may reach here for the same game; the notification
 * carries one tag per game, so the second simply replaces the first.
 */
export async function pushFullTime(matchId: string, gameId: string) {
  if (!pushConfigured()) return;

  const [match, live, targets] = await Promise.all([
    getMatch(matchId),
    getMatchLive(matchId),
    pushTargetsFor(matchId),
  ]);
  if (!match || !targets.length) return;

  const message = fullTimeMessage(
    match,
    live,
    gameId,
    livePath(match, matchSlug(match.playedAt)),
  );
  if (!message) return;

  const gone = await sendPush(targets, message);
  await forgetPushSubscriptions(gone);
}
