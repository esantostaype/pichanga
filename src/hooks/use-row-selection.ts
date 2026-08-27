"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Row selection for the drawer tables.
 *
 * Ids that disappear from `rows` are filtered out on read instead of being
 * synced away in an effect: deleting the selected rows would otherwise need a
 * state write reacting to a state change, and the selection would briefly
 * disagree with what is on screen.
 */
export function useRowSelection<T extends { id: string }>(rows: T[]) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  const available = useMemo(
    () => new Set(rows.map((row) => row.id)),
    [rows],
  );

  const selected = useMemo(
    () => [...picked].filter((id) => available.has(id)),
    [picked, available],
  );

  const toggle = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setPicked(new Set()), []);

  const toggleAll = useCallback(() => {
    setPicked((prev) => {
      const everyRowPicked =
        rows.length > 0 && rows.every((row) => prev.has(row.id));
      return everyRowPicked ? new Set() : new Set(rows.map((row) => row.id));
    });
  }, [rows]);

  const count = selected.length;

  return {
    selected,
    count,
    isSelected: (id: string) => picked.has(id),
    toggle,
    toggleAll,
    clear,
    /** `true`, `false` or `"indeterminate"`, as the header checkbox wants it. */
    headerState: (count === 0
      ? false
      : count === rows.length
        ? true
        : "indeterminate") as boolean | "indeterminate",
  };
}
