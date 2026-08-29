"use client";

import { useEffect } from "react";

/**
 * Keeps the screen awake while a page is open.
 *
 * Whoever is keeping score has their phone in one hand for an hour, and a
 * screen that locks every thirty seconds turns "tap the scorer" into "unlock,
 * find the tab, tap the scorer". The lock is dropped the moment the page is
 * left, and re-taken when it comes back: a browser releases it on its own when
 * the tab is hidden, and does not hand it back afterwards.
 *
 * Not every browser has this, and none of them owe it to us -- it is asked for
 * and forgotten about.
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let dropped = false;

    const take = async () => {
      if (dropped || document.visibilityState !== "visible") return;

      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Refused, unsupported, or the battery is too low to allow it. The
        // page works exactly the same; the screen just sleeps.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void take();
    };

    void take();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      dropped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
