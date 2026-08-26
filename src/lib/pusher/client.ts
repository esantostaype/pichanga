"use client";

import PusherJS from "pusher-js";

let instance: PusherJS | null = null;

/**
 * Singleton: one WebSocket connection per tab, shared by every component
 * listening for events.
 */
export function getPusherClient(): PusherJS | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[pusher] NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER missing: realtime is disabled.",
      );
    }
    return null;
  }

  instance ??= new PusherJS(key, { cluster, forceTLS: true });

  return instance;
}
