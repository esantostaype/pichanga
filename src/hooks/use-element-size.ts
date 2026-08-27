"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type Size = { width: number; height: number };

/**
 * Measures an element with ResizeObserver. Used to compute the pitch geometry
 * in real pixels, which is what keeps the center circle 1:1.
 *
 * Reports the border box, so padding counts as occupied space.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const apply = (width: number, height: number) =>
      setSize((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height },
      );

    // Measure once up front instead of waiting for the observer's first
    // delivery. Without this, anything that depends on the size stays at zero
    // until a notification arrives, and if one never does the pitch simply
    // never draws. Deferred to a microtask so the effect writes no state
    // synchronously.
    queueMicrotask(() => {
      const box = node.getBoundingClientRect();
      apply(box.width, box.height);
    });

    const observer = new ResizeObserver(([entry]) => {
      const border = entry.borderBoxSize?.[0];
      apply(
        border ? border.inlineSize : entry.contentRect.width,
        border ? border.blockSize : entry.contentRect.height,
      );
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
