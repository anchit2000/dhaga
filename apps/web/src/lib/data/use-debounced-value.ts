"use client";

import { useDebouncedValue as usePacerDebouncedValue } from "@tanstack/react-pacer";

/**
 * The value as of `delayMs` ago — settles after the caller stops changing it.
 * Thin adapter over TanStack Pacer's debouncer so the vendor API stays confined
 * to this one file (swap or revert = a one-file change), per docs/LIBRARIES.md.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced] = usePacerDebouncedValue(value, { wait: delayMs });
  return debounced;
}
