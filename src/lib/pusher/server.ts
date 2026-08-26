import "server-only";

import Pusher from "pusher";

import { REALTIME } from "@/lib/constants";
import { env } from "@/lib/env";

type RealtimeEvent = (typeof REALTIME.events)[keyof typeof REALTIME.events];

let instance: Pusher | null = null;

function pusher() {
  instance ??= new Pusher({
    appId: env.PUSHER_APP_ID,
    key: env.NEXT_PUBLIC_PUSHER_KEY,
    secret: env.PUSHER_SECRET,
    cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  });

  return instance;
}

/**
 * Notifies every other screen. Never throws: if Pusher fails the mutation is
 * already persisted and the client that made it still sees the right data.
 */
export async function broadcast(
  event: RealtimeEvent,
  payload: Record<string, unknown> = {},
) {
  try {
    await pusher().trigger(REALTIME.channel, event, payload);
  } catch (error) {
    console.error("[pusher] could not emit", event, error);
  }
}
