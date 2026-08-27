"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Size = { width: number; height: number };

/**
 * Measures an element with ResizeObserver. Used to compute the pitch geometry
 * in real pixels, which is what keeps the center circle 1:1.
 *
 * Reports the border box, so padding counts as occupied space.
 *
 * The returned value is a **callback ref**, not a plain one: an effect on mount
 * only ever sees the node that existed on mount, so anything rendered after a
 * loading branch was never observed and stayed at zero forever. This attaches
 * the observer whenever the node itself arrives or changes.
 */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;

    const apply = (width: number, height: number) =>
      setSize((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height },
      );

    // Measured once up front instead of waiting for the observer's first
    // delivery. Without this, anything that depends on the size stays at zero
    // until a notification arrives, and if one never does the pitch simply
    // never draws. Deferred to a microtask so nothing writes state during the
    // commit that attached the ref.
    queueMicrotask(() => {
      const box = node.getBoundingClientRect();
      apply(box.width, box.height);
    });

    const next = new ResizeObserver(([entry]) => {
      const border = entry.borderBoxSize?.[0];
      apply(
        border ? border.inlineSize : entry.contentRect.width,
        border ? border.blockSize : entry.contentRect.height,
      );
    });

    next.observe(node);
    observer.current = next;
  }, []);

  useEffect(
    () => () => {
      observer.current?.disconnect();
    },
    [],
  );

  return [ref, size] as const;
}
