"use client";

import { useCallback, useEffect, useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";

/** A submit's outcome: `null` when the server accepted it, else a user-facing
 *  error message that triggers rollback + a Retry toast. */
export type SubmitResult = string | null;

/** One optimistic edit to the list: append an item or drop one. */
type ListChange<TItem> =
  | { kind: "add"; item: TItem }
  | { kind: "remove"; item: TItem };

export interface OptimisticList<TItem> {
  /** Server truth plus any in-flight optimistic edits, in render order. */
  items: TItem[];
  /** True while at least one edit is mid-flight (optimistic → reconciled). */
  pending: boolean;
  /**
   * Show `item` immediately, then run `submit` and reconcile. `submit` MUST
   * trigger the route's revalidation (a server action's `revalidatePath` and/or
   * `router.refresh()`) so the optimistic row is replaced by real server data.
   * On failure React drops the optimistic row (automatic rollback) and a toast
   * offers Retry, which replays the exact same add.
   */
  add: (item: TItem, submit: () => Promise<SubmitResult>) => void;
  /**
   * Drop `item` immediately (identity match against the current items), then run
   * `submit` and reconcile — the mirror of `add` for completing/dismissing a
   * row. Same revalidation contract; on failure the row reappears and a Retry
   * toast replays the removal.
   */
  remove: (item: TItem, submit: () => Promise<SubmitResult>) => void;
}

/**
 * Optimistic add/remove for a server-backed list — the list-shaped sibling of
 * `useOptimisticToggle`. The hosting component owns the server `items`; each
 * edit applies instantly, awaits the server inside one transition (so the
 * optimistic state holds until the revalidated data lands — no flash), and
 * rolls back with a Retry toast on error. Reuse existing server actions
 * unchanged; the caller only wraps one in `submit`.
 */
export function useOptimisticList<TItem>({
  items,
  errorMessage,
}: {
  items: TItem[];
  errorMessage: string;
}): OptimisticList<TItem> {
  const [optimisticItems, applyChange] = useOptimistic(
    items,
    (current: TItem[], change: ListChange<TItem>): TItem[] =>
      change.kind === "add"
        ? [...current, change.item]
        : current.filter((existing) => existing !== change.item),
  );
  const [pending, startTransition] = useTransition();
  const mutateRef = useRef<
    ((change: ListChange<TItem>, submit: () => Promise<SubmitResult>) => void) | null
  >(null);

  const mutate = useCallback(
    (change: ListChange<TItem>, submit: () => Promise<SubmitResult>): void => {
      startTransition(async () => {
        applyChange(change);
        let error: SubmitResult;
        try {
          error = await submit();
        } catch {
          error = errorMessage;
        }
        if (error) {
          // The transition ends without `items` changing, so React drops the
          // optimistic edit — rollback is automatic. Offer a one-tap Retry.
          toast.error(error, {
            action: { label: "Retry", onClick: () => mutateRef.current?.(change, submit) },
          });
        }
      });
    },
    [applyChange, errorMessage],
  );
  // Latest-ref so the Retry closure can replay `mutate` without making it depend
  // on itself (which would defeat its memoization).
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  const add = useCallback(
    (item: TItem, submit: () => Promise<SubmitResult>): void =>
      mutate({ kind: "add", item }, submit),
    [mutate],
  );
  const remove = useCallback(
    (item: TItem, submit: () => Promise<SubmitResult>): void =>
      mutate({ kind: "remove", item }, submit),
    [mutate],
  );

  return { items: optimisticItems, pending, add, remove };
}
