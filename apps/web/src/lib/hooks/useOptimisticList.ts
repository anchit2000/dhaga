"use client";

import { useCallback, useEffect, useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";

/** A submit's outcome: `null` when the server accepted it, else a user-facing
 *  error message that triggers rollback + a Retry toast. */
export type SubmitResult = string | null;

export interface OptimisticList<TItem> {
  /** Server truth plus any in-flight optimistic additions, in render order. */
  items: TItem[];
  /** True while at least one add is mid-flight (optimistic → reconciled). */
  pending: boolean;
  /**
   * Show `item` immediately, then run `submit` and reconcile. `submit` MUST
   * trigger the route's revalidation (a server action's `revalidatePath` and/or
   * `router.refresh()`) so the optimistic row is replaced by real server data.
   * On failure React drops the optimistic row (automatic rollback) and a toast
   * offers Retry, which replays the exact same add.
   */
  add: (item: TItem, submit: () => Promise<SubmitResult>) => void;
}

/**
 * Optimistic add for a server-backed list — the list-shaped sibling of
 * `useOptimisticToggle`. The hosting component owns the server `items`; each
 * add appends instantly, awaits the server inside one transition (so the
 * optimistic row holds until the revalidated data lands — no flash), and rolls
 * back with a Retry toast on error. Reuse existing server actions unchanged;
 * the caller only wraps one in `submit`.
 */
export function useOptimisticList<TItem>({
  items,
  errorMessage,
}: {
  items: TItem[];
  errorMessage: string;
}): OptimisticList<TItem> {
  const [optimisticItems, appendItem] = useOptimistic(
    items,
    (current: TItem[], incoming: TItem): TItem[] => [...current, incoming],
  );
  const [pending, startTransition] = useTransition();
  const addRef = useRef<OptimisticList<TItem>["add"] | null>(null);

  const add = useCallback(
    (item: TItem, submit: () => Promise<SubmitResult>): void => {
      startTransition(async () => {
        appendItem(item);
        let error: SubmitResult;
        try {
          error = await submit();
        } catch {
          error = errorMessage;
        }
        if (error) {
          // The transition ends without `items` changing, so React drops the
          // optimistic row — rollback is automatic. Offer a one-tap Retry.
          toast.error(error, {
            action: { label: "Retry", onClick: () => addRef.current?.(item, submit) },
          });
        }
      });
    },
    [appendItem, errorMessage],
  );
  // Latest-ref so the Retry closure can replay `add` without making `add`
  // depend on itself (which would defeat its memoization).
  useEffect(() => {
    addRef.current = add;
  }, [add]);

  return { items: optimisticItems, pending, add };
}
