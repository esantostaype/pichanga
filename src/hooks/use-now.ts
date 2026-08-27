"use client";

import { useEffect, useState } from "react";

/**
 * A clock that ticks on an interval, so anything time-dependent (the "Live"
 * chip, the relative label) flips on its own without a reload.
 *
 * It starts at `null` and only gets a value after mount: reading the clock
 * during render would make the server and client markup disagree.
 */
export function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Deferred rather than set inline, so the effect never writes state
    // synchronously and trigger a cascading render.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), intervalMs);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
