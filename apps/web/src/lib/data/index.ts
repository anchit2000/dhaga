// Active adapter for the data gateway. To swap TanStack Query for another
// library — or a hand-rolled implementation — write a new adapter satisfying
// types.ts and point these re-exports at it. Call sites only ever import
// from "@/lib/data".
export { DataProvider, useAsyncData, usePagedData } from "./tanstack";
export { useDebouncedValue } from "./use-debounced-value";
export type {
  AsyncDataOptions,
  AsyncDataResult,
  PagedDataOptions,
  PagedDataResult,
} from "./types";
