"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api-client";
import { PRESENCE } from "@/lib/constants";

const STORAGE_KEY = "pichanga:visitor";

/**
 * A random id for this tab. Session storage, not local: every tab gets its own
 * id, so five tabs count as five. It is not tied to a player, a name or an
 * address, and it survives a reload of the same tab.
 */
function visitorId() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return stored;

    const fresh = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private windows and blocked storage: a fresh id per load still counts.
    return crypto.randomUUID();
  }
}

/**
 * Reports this tab as open, background tabs included, and says so on the way
 * out. A browser throttles the timer once the tab is hidden, which the width
 * of the window absorbs; the beacon is what keeps a closed tab from lingering
 * in the count until then.
 */
export function useVisitorHeartbeat() {
  useEffect(() => {
    const id = visitorId();
    let stopped = false;

    const beat = () => {
      if (stopped) return;
      // A missed beat only shortens this tab's window, and the next one puts
      // it back, so a failure needs no handling beyond not throwing.
      void api.presence.beat(id).catch(() => undefined);
    };

    // Coming back to the foreground is the moment a throttled tab is most
    // likely to have fallen out of the window, so it beats immediately.
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };

    /**
     * Fired as the tab goes away. `sendBeacon` survives the page being torn
     * down, which `fetch` does not.
     */
    const leave = () => {
      stopped = true;
      try {
        navigator.sendBeacon(
          "/api/presence",
          new Blob([JSON.stringify({ id, leaving: true })], {
            type: "application/json",
          }),
        );
      } catch {
        // Nothing left to do: the window expires this tab in two minutes.
      }
    };

    beat();
    const timer = setInterval(beat, PRESENCE.beatMs);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", leave);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", leave);
    };
  }, []);
}

/**
 * Live count, polled from the server. Only mount this for a super admin:
 * for anyone else the route answers 403 and the count stays null.
 */
export function useLiveVisitors() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        const { count: live } = await api.presence.count();
        if (!cancelled) setCount(live);
      } catch {
        // Offline, or the session expired: hide the number rather than
        // leaving a stale one on screen.
        if (!cancelled) setCount(null);
      }
    };

    void read();
    const timer = setInterval(() => void read(), PRESENCE.pollMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return count;
}
