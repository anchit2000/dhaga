"use client";

import { type FormEvent, useState } from "react";
import { Loader2, Network, X } from "lucide-react";
import type {
  ConnectionFacet,
  ConnectionItem,
} from "@/lib/repo/connections";
import type {
  NetworkIntent,
  RecommendedContact,
} from "@/lib/repo/recommendations";
import { ConnectionsList } from "./ConnectionsList";
import { RecommendedList } from "./RecommendedList";

type Section = "connections" | "nearby";

export function OnDemandNetwork({ contactId }: { contactId: string }) {
  const [connections, setConnections] = useState<ConnectionItem[] | null>(null);
  const [connectionCursor, setConnectionCursor] = useState<string | null>(null);
  const [facets, setFacets] = useState<ConnectionFacet[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<string[]>([]);
  const [connectionQuery, setConnectionQuery] = useState("");
  const [nearby, setNearby] = useState<RecommendedContact[] | null>(null);
  const [nearbyCursor, setNearbyCursor] = useState<string | null>(null);
  const [intent, setIntent] = useState<NetworkIntent>("general");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState<Record<Section, boolean>>({
    connections: false,
    nearby: false,
  });
  const [error, setError] = useState<string | null>(null);

  async function loadConnections(cursor?: string, replace = false) {
    setLoading((current) => ({ ...current, connections: true }));
    setError(null);
    try {
      const params = new URLSearchParams({ section: "connections" });
      if (cursor) params.set("cursor", cursor);
      if (connectionQuery.trim()) params.set("q", connectionQuery.trim());
      for (const key of selectedFacets) {
        const facet = facets.find((item) => `${item.source}|${item.value}` === key);
        if (facet) params.append("facet", `${facet.source}:${facet.value}`);
      }
      const result = await request(`/api/contacts/${encodeURIComponent(contactId)}/network?${params}`);
      setConnections((current) =>
        replace || !current ? result.items : mergeById(current, result.items),
      );
      setConnectionCursor(result.nextCursor);
      if (result.facets.length > 0) setFacets(result.facets);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading((current) => ({ ...current, connections: false }));
    }
  }

  async function loadNearby(cursor?: string, replace = false) {
    setLoading((current) => ({ ...current, nearby: true }));
    setError(null);
    try {
      const params = new URLSearchParams({ section: "nearby", intent });
      if (cursor) params.set("cursor", cursor);
      if (context.trim()) params.set("context", context.trim());
      const result = await request(`/api/contacts/${encodeURIComponent(contactId)}/network?${params}`);
      setNearby((current) =>
        replace || !current ? result.items : mergeById(current, result.items),
      );
      setNearbyCursor(result.nextCursor);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading((current) => ({ ...current, nearby: false }));
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-seam bg-panel p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber">
          <Network className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg">Network</h2>
          <p className="text-xs leading-relaxed text-fog">
            Paginated graph retrieval and local ranking—no AI calls when you browse.
          </p>
        </div>
      </div>

      {connections === null ? (
        <LoadButton loading={loading.connections} onClick={() => loadConnections(undefined, true)}>
          Show connections
        </LoadButton>
      ) : (
        <div className="space-y-3 border-t border-seam pt-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void loadConnections(undefined, true);
            }}
          >
            <input
              value={connectionQuery}
              onChange={(event) => setConnectionQuery(event.target.value)}
              placeholder="Filter people…"
              className="h-8 min-w-40 flex-1 rounded-full border border-seam bg-well px-3 text-xs outline-none focus:border-amber/50"
            />
            <select
              value=""
              onChange={(event) => {
                const value = event.target.value;
                if (value) setSelectedFacets((current) => [...new Set([...current, value])]);
              }}
              aria-label="Relationship filter"
              className="h-8 max-w-full rounded-full border border-seam bg-well px-3 text-xs text-paper outline-none focus:border-amber/50"
            >
              <option value="">All relationship types</option>
              {facets
                .filter((facet) => !selectedFacets.includes(`${facet.source}|${facet.value}`))
                .map((facet) => (
                <option key={`${facet.source}|${facet.value}`} value={`${facet.source}|${facet.value}`}>
                  {facet.label} ({facet.count})
                </option>
                ))}
            </select>
            <LoadButton loading={loading.connections} onClick={() => loadConnections(undefined, true)}>
              Apply
            </LoadButton>
            {selectedFacets.length > 0 || connectionQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedFacets([]);
                  setConnectionQuery("");
                }}
                className="inline-flex size-8 items-center justify-center rounded-full border border-seam text-fog hover:text-paper"
                aria-label="Clear connection filters"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </form>
          {selectedFacets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" aria-label="Active relationship filters">
              {selectedFacets.map((key) => {
                const facet = facets.find((item) => `${item.source}|${item.value}` === key);
                if (!facet) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedFacets((current) => current.filter((item) => item !== key))}
                    className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2 py-1 text-[10px] text-amber"
                    aria-label={`Remove ${facet.label} filter`}
                  >
                    {facet.label} <X className="size-2.5" />
                  </button>
                );
              })}
            </div>
          ) : null}
          {connections.length > 0 ? (
            <ConnectionsList connections={connections} />
          ) : (
            <Empty label="No connections match these filters." />
          )}
          {connectionCursor ? (
            <LoadButton loading={loading.connections} onClick={() => loadConnections(connectionCursor)}>
              Load more connections
            </LoadButton>
          ) : null}
        </div>
      )}

      {nearby === null ? (
        <LoadButton loading={loading.nearby} onClick={() => loadNearby(undefined, true)}>
          Find relevant people
        </LoadButton>
      ) : (
        <div className="space-y-3 border-t border-seam pt-4">
          <form
            className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              void loadNearby(undefined, true);
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
            <LoadButton loading={loading.nearby} onClick={() => loadNearby(undefined, true)}>
              Rank locally
            </LoadButton>
          </form>
          {nearby.length > 0 ? (
            <RecommendedList recommendations={nearby} />
          ) : (
            <Empty label="No one has enough shared context yet. Add a sector, stage, geography, or intent." />
          )}
          {nearbyCursor ? (
            <LoadButton loading={loading.nearby} onClick={() => loadNearby(nearbyCursor)}>
              Load more people
            </LoadButton>
          ) : null}
        </div>
      )}

      {error ? <p className="text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}

async function request(url: string) {
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load network data.");
  return result;
}

function mergeById<T extends { contactId: string }>(current: T[], incoming: T[]): T[] {
  const found = new Map(current.map((item) => [item.contactId, item]));
  for (const item of incoming) found.set(item.contactId, item);
  return [...found.values()];
}

function messageFrom(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Could not load network data.";
}

function LoadButton({ loading, onClick, children }: { loading: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-amber/35 px-3 text-xs text-ember transition-colors hover:bg-amber/10 disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : null}
      {children}
    </button>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-xs text-fog">{label}</p>;
}
