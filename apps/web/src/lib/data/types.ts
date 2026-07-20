/**
 * Contract for the client-side data-fetching gateway. Components import hooks
 * from `@/lib/data` — never from a vendor package — so swapping the underlying
 * library (or hand-rolling again) means reimplementing one adapter file
 * against these types, with zero call-site changes. Same shape as the
 * LLM/Search gateways in packages/core.
 */

export interface AsyncDataOptions<T> {
  /** Cache identity; a changed key is a different query and refetches. */
  key: readonly unknown[];
  fetcher: (signal: AbortSignal) => Promise<T>;
  /** When false, nothing fetches — lazy queries wait for user intent. */
  enabled?: boolean;
  /** Server-rendered seed shown before any client fetch happens. */
  initialData?: T;
  /** How long a result stays fresh (no auto refetch on remount);
   *  "forever" = only polling or an explicit refetch() updates it. */
  staleMs?: number | "forever";
  /** Poll cadence in ms. A function decides from the latest data and the
   *  consecutive-failure count; return false to stop polling. */
  refetchIntervalMs?:
    | number
    | ((data: T | undefined, consecutiveFailures: number) => number | false);
}

export interface AsyncDataResult<T> {
  data: T | undefined;
  error: Error | null;
  /** First load in flight, nothing to show yet. */
  isLoading: boolean;
  /** Any fetch in flight (first load, poll, or refetch). */
  isFetching: boolean;
  refetch: () => void;
}

export interface PagedDataOptions<TPage> {
  key: readonly unknown[];
  /** Fetch one page; cursor is null for the first page. */
  fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<TPage>;
  /** Extract the next-page cursor from a fetched page (null = no more). */
  nextCursor: (page: TPage) => string | null;
  enabled?: boolean;
}

export interface PagedDataResult<TPage> {
  /** Every page fetched so far under the current key. */
  pages: TPage[];
  error: Error | null;
  /** First page in flight, nothing to show yet. */
  isLoading: boolean;
  /** Any page fetch in flight. */
  isFetching: boolean;
  hasMore: boolean;
  loadMore: () => void;
  /** Drop accumulated pages and reload from the first. */
  refetch: () => void;
}
