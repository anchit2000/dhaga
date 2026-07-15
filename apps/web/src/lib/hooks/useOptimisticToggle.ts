"use client";

import { useCallback, useOptimistic, useTransition } from "react";
import { toast } from "sonner";

interface OptimisticToggle<T> {
  /** The value to render — the optimistic guess while pending, the server truth otherwise. */
  value: T;
  pending: boolean;
  set: (next: T) => void;
}

/**
 * Optimistic value backed by a server mutation. The UI flips to `next`
 * instantly; on success the server action must revalidate so the fresh `value`
 * prop matches, and on failure React auto-reverts to `value` and we toast.
 *
 * Canonical shape for the fast, predictable mutations (watch on/off, cadence).
 * List add/remove needs a different shape and is handled at each call site.
 */
export function useOptimisticToggle<T>({
  value,
  mutate,
  errorMessage,
}: {
  value: T;
  mutate: (next: T) => Promise<void>;
  errorMessage: string;
}): OptimisticToggle<T> {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, startTransition] = useTransition();

  const set = useCallback(
    (next: T): void => {
      startTransition(async () => {
        setOptimistic(next);
        try {
          await mutate(next);
        } catch {
          // The optimistic value reverts automatically when the transition
          // ends without the source `value` having changed.
          toast.error(errorMessage);
        }
      });
    },
    [mutate, errorMessage, setOptimistic],
  );

  return { value: optimistic, pending, set };
}
