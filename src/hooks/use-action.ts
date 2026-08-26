"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Options<TResult> = {
  /** Success message; no toast is shown when omitted. */
  success?: string;
  onSuccess?: (result: TResult) => void;
};

/**
 * Runs a mutation with loading state and toasts, so the same try/catch is not
 * repeated in every form.
 */
export function useAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: Options<TResult> = {},
) {
  const [pending, setPending] = useState(false);

  // `run` is stable; the ref always holds the latest callback and options so
  // we never call a stale closure.
  const latest = useRef({ fn, options });

  useEffect(() => {
    latest.current = { fn, options };
  });

  const run = useCallback(async (...args: TArgs) => {
    setPending(true);
    try {
      const result = await latest.current.fn(...args);
      const { success, onSuccess } = latest.current.options;
      if (success) toast.success(success);
      onSuccess?.(result);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete");
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending };
}
