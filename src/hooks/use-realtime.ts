"use client";

import { useEffect, useRef } from "react";

import { REALTIME } from "@/lib/constants";
import { getPusherClient } from "@/lib/pusher/client";

type EventName = (typeof REALTIME.events)[keyof typeof REALTIME.events];
type Handlers = Partial<Record<EventName, (payload: unknown) => void>>;

/**
 * Subscribes the component to the match channel. Handlers live in a ref so the
 * callback can change without resubscribing.
 */
export function useRealtime(handlers: Handlers) {
  const latest = useRef(handlers);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(REALTIME.channel);
    const names = Object.values(REALTIME.events);

    const bound = names.map((name) => {
      const listener = (payload: unknown) => latest.current[name]?.(payload);
      channel.bind(name, listener);
      return [name, listener] as const;
    });

    return () => {
      bound.forEach(([name, listener]) => channel.unbind(name, listener));
      pusher.unsubscribe(REALTIME.channel);
    };
  }, []);
}
