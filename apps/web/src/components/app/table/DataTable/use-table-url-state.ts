"use client";

import { useCallback, useMemo, useTransition } from "react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/utils/constants/table";

/**
 * Server-mode table state writer: column filters, page, and pageSize live in
 * the URL, and shallow:false round-trips through the server so the RSC page
 * re-renders with the new slice. nuqs is confined to this file — swapping
 * URL-state libraries (or hand-rolling URLSearchParams again) touches only
 * this hook.
 */
export function useTableUrlState(filterIds: readonly string[]): {
  /** True while the server round-trip is in flight (drives the busy dim). */
  isNavigating: boolean;
  /** Write params in one batched replace; "" or null clears a param. */
  setParams: (updates: Record<string, string | number | null>) => void;
} {
  const [isNavigating, startTransition] = useTransition();
  // Content-keyed so the parser map is stable while the column set is.
  const idsKey = filterIds.join(",");
  const parsers = useMemo(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    return {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(DEFAULT_TABLE_PAGE_SIZE),
      ...Object.fromEntries(ids.map((id) => [id, parseAsString.withDefault("")])),
    };
  }, [idsKey]);
  const [, setValues] = useQueryStates(parsers, {
    history: "replace",
    scroll: false,
    shallow: false,
    startTransition,
  });
  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next: Record<string, string | number | null> = {};
      for (const [key, value] of Object.entries(updates)) {
        next[key] = value === "" ? null : value;
      }
      void setValues(next);
    },
    [setValues],
  );
  return { isNavigating, setParams };
}
