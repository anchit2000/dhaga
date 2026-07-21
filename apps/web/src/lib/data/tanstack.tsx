"use client";

import { useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import type {
  AsyncDataOptions,
  AsyncDataResult,
  PagedDataOptions,
  PagedDataResult,
} from "./types";

/**
 * TanStack Query implementation of the data gateway (contract in types.ts).
 * This is the only file that may import @tanstack/react-query.
 */

export function DataProvider({ children }: { children: ReactNode }) {
  // One client per mounted app. Defaults mirror the hand-rolled fetching this
  // gateway replaced: no focus refetching, no implicit retries.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function useAsyncData<T>(options: AsyncDataOptions<T>): AsyncDataResult<T> {
  const { refetchIntervalMs } = options;
  const query = useQuery({
    queryKey: options.key,
    queryFn: ({ signal }) => options.fetcher(signal),
    enabled: options.enabled ?? true,
    initialData: options.initialData,
    staleTime: options.staleMs === "forever" ? Infinity : options.staleMs,
    refetchInterval:
      typeof refetchIntervalMs === "function"
        ? (query) => refetchIntervalMs(query.state.data, query.state.fetchFailureCount)
        : refetchIntervalMs,
  });
  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: () => void query.refetch(),
  };
}

export function usePagedData<TPage>(options: PagedDataOptions<TPage>): PagedDataResult<TPage> {
  const query = useInfiniteQuery({
    queryKey: options.key,
    queryFn: ({ pageParam, signal }) => options.fetchPage(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => options.nextCursor(lastPage),
    enabled: options.enabled ?? true,
  });
  return {
    pages: query.data?.pages ?? [],
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasMore: query.hasNextPage,
    loadMore: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  };
}
