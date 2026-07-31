"use client";

import { useAsyncData } from "@/lib/data";

/**
 * Client-side read of the AI-credit gate, for the two controls the app shell
 * mounts from a client component (nav quick-add, Ask Dhaga) and so cannot be
 * handed a server-resolved prop. Everywhere else, pass `aiGateReason(userId)`
 * down as a prop instead of calling this.
 *
 * `enabled` keeps it lazy — nothing is fetched until the surface is actually
 * opened — and the result is held for the session, since a cap only moves when
 * the user spends a credit (in which case the answer was "you had budget"
 * anyway) or the month rolls over. Undefined while loading means "not gated":
 * the server is still the enforcement, so an optimistic control that gets
 * refused is exactly today's behaviour, never a worse one.
 */
export function useAiGate(enabled: boolean): string | null {
  const { data } = useAsyncData<{ reason: string | null }>({
    key: ["ai-gate"],
    enabled,
    staleMs: "forever",
    fetcher: async (signal) => {
      const response = await fetch("/api/ai/gate", { signal });
      if (!response.ok) return { reason: null };
      return (await response.json()) as { reason: string | null };
    },
  });
  return data?.reason ?? null;
}
