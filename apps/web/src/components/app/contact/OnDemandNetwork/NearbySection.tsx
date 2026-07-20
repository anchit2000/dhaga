"use client";

import { useState } from "react";
import { usePagedData } from "@/lib/data";
import type { NetworkIntent, RecommendedContact } from "@/lib/repo/recommendations";
import { RecommendedList } from "../RecommendedList";
import { Empty, LoadButton, SectionError, fetchNetworkPage, mergeById } from "./shared";

interface NearbyPage {
  items: RecommendedContact[];
  nextCursor: string | null;
}

interface NearbyFilter {
  intent: NetworkIntent;
  context: string;
}

export function NearbySection({ contactId }: { contactId: string }) {
  const [started, setStarted] = useState(false);
  const [intent, setIntent] = useState<NetworkIntent>("general");
  const [context, setContext] = useState("");
  const [filter, setFilter] = useState<NearbyFilter>({ intent: "general", context: "" });

  const { pages, error, isFetching, hasMore, loadMore, refetch } = usePagedData<NearbyPage>({
    key: ["contact-network", contactId, "nearby", filter.intent, filter.context],
    fetchPage: (cursor, signal) => {
      const params = new URLSearchParams({ section: "nearby", intent: filter.intent });
      if (cursor) params.set("cursor", cursor);
      if (filter.context) params.set("context", filter.context);
      return fetchNetworkPage(contactId, params, signal);
    },
    nextCursor: (page) => page.nextCursor,
    enabled: started,
  });

  function apply(): void {
    const next = { intent, context: context.trim() };
    if (next.intent === filter.intent && next.context === filter.context) {
      refetch();
    } else {
      setFilter(next);
    }
  }

  if (!started || pages.length === 0) {
    return (
      <div className="space-y-3">
        <LoadButton loading={isFetching} onClick={() => (started ? refetch() : setStarted(true))}>
          Find relevant people
        </LoadButton>
        <SectionError error={error} />
      </div>
    );
  }

  const nearby = mergeById(pages.map((page) => page.items));
  return (
    <div className="space-y-3 border-t border-seam pt-4">
      <form
        className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <select
          value={intent}
          onChange={(event) => setIntent(event.target.value as NetworkIntent)}
          aria-label="Your goal"
          className="h-8 rounded-full border border-seam bg-well px-3 text-xs text-paper outline-none focus:border-amber/50"
        >
          <option value="general">Any goal</option>
          <option value="founder">Founder</option>
          <option value="sales">Sales</option>
          <option value="investor">Investor</option>
        </select>
        <input
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="Useful context: fintech, India, seed stage…"
          className="h-8 rounded-full border border-seam bg-well px-3 text-xs outline-none focus:border-amber/50"
        />
        <LoadButton loading={isFetching} onClick={apply}>
          Rank locally
        </LoadButton>
      </form>
      {nearby.length > 0 ? (
        <RecommendedList recommendations={nearby} />
      ) : (
        <Empty label="No one has enough shared context yet. Add a sector, stage, geography, or intent." />
      )}
      {hasMore ? (
        <LoadButton loading={isFetching} onClick={loadMore}>
          Load more people
        </LoadButton>
      ) : null}
      <SectionError error={error} />
    </div>
  );
}
