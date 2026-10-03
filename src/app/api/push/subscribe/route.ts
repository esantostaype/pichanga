import { savePushSubscription } from "@/db/queries";
import { json, readJson, route } from "@/lib/http";
import { pushSubscriptionSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/**
 * A browser asking to be told when a game ends, phone locked or not.
 *
 * Open to anybody, like keeping score: it hands over nothing but where to
 * reach this browser, and which match it is following.
 */
export async function POST(request: Request) {
  return route(async () => {
    const input = await readJson(request, pushSubscriptionSchema);

    await savePushSubscription({
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      matchId: input.matchId,
    });

    return json({ ok: true }, 201);
  });
}
