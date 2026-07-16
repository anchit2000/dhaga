"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GRAPH_SEARCH_RESULT_CAP, GRAPH_TARGET_RESULTS_DISMISS_MS } from "@/utils/constants/graph";
import { KindDot } from "./KindDot";
import type { FullGraphNode, GraphNodeType } from "../types";

/** Client-side typeahead over loaded node labels — pick a node to fly to it. */
export function GraphSearch({
  nodes,
  nodeTypes,
  onPick,
}: {
  nodes: readonly FullGraphNode[];
  nodeTypes: readonly GraphNodeType[];
  onPick: (nodeId: string) => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) return [];
    const matches: FullGraphNode[] = [];
    for (const node of nodes) {
      if (node.label.toLowerCase().includes(normalized)) {
        matches.push(node);
        if (matches.length >= GRAPH_SEARCH_RESULT_CAP) break;
      }
    }
    return matches;
  }, [nodes, normalized]);

  const pick = (nodeId: string): void => {
    setQuery("");
    onPick(nodeId);
  };

  return (
    <div className="pointer-events-auto relative w-56 sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fog" aria-hidden />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results.length > 0) pick(results[0].id);
          if (event.key === "Escape") setQuery("");
        }}
        onBlur={() => setTimeout(() => setQuery(""), GRAPH_TARGET_RESULTS_DISMISS_MS)}
        placeholder="Search the graph…"
        aria-label="Search graph nodes"
        className="h-9 bg-panel/90 pl-8 text-sm backdrop-blur"
      />
      {results.length > 0 ? (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-seam bg-panel py-1 shadow-lg">
          {results.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(node.id)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-paper hover:bg-wash/[0.05]"
              >
                <KindDot node={node} nodeTypes={nodeTypes} />
                <span className="truncate">{node.label}</span>
                {node.sublabel ? (
                  <span className="ml-auto truncate pl-2 text-xs text-fog">{node.sublabel}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
