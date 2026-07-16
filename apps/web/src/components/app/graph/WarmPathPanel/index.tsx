"use client";

import { useActionState, useEffect, useState } from "react";
import { Crosshair, MoveRight } from "lucide-react";
import { findWarmPathsAction, type WarmPathState } from "@/lib/actions/graph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GRAPH_TARGET_RESULTS_DISMISS_MS,
  GRAPH_TARGET_SEARCH_DEBOUNCE_MS,
  WARM_PATH_TARGET_KINDS,
} from "@/utils/constants/graph";
import type { GraphTarget } from "@/lib/repo/graph-data";
import { SubmitButton } from "../../SubmitButton";
import { PathChip } from "./PathChip";

/** "Who can intro me to X?" — type to search (contacts + companies aren't
 *  eagerly loaded anymore, see /app/graph's cluster redesign), pick a
 *  target, get chains from your people. */
export function WarmPathPanel({
  onShowPath,
}: {
  /** Reveal a found chain on the graph canvas (emphasis + camera fit). */
  onShowPath?: (nodeIds: readonly string[]) => void;
}) {
  const [state, formAction] = useActionState<WarmPathState, FormData>(findWarmPathsAction, {});
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState({ query: "", targets: [] as GraphTarget[] });
  const [selected, setSelected] = useState<GraphTarget | null>(null);
  const normalizedQuery = query.trim();
  const results =
    !selected && searchResult.query === normalizedQuery ? searchResult.targets : [];

  useEffect(() => {
    if (selected || !normalizedQuery) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // kinds narrows to what warm paths can reach; the client-side filter
        // is belt-and-braces for servers that don't support the param yet.
        const res = await fetch(
          `/api/graph/targets?q=${encodeURIComponent(normalizedQuery)}&kinds=${WARM_PATH_TARGET_KINDS.join(",")}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data: { targets: GraphTarget[] } = await res.json();
        setSearchResult({
          query: normalizedQuery,
          targets: data.targets.filter((target) => WARM_PATH_TARGET_KINDS.includes(target.kind)),
        });
      } catch {
        if (!controller.signal.aborted) {
          setSearchResult({ query: normalizedQuery, targets: [] });
        }
      }
    }, GRAPH_TARGET_SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, selected]);

  return (
    <div className="space-y-3 rounded-2xl border border-seam bg-panel p-4">
      <form
        action={(formData) => {
          if (selected) {
            formData.set("targetId", selected.id);
            formData.set("targetLabel", selected.label);
          }
          formAction(formData);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <p className="mr-1 text-sm font-medium text-paper">Warm path to</p>
        <div className="relative">
          <Input
            value={selected ? selected.label : query}
            onChange={(event) => {
              setSelected(null);
              setQuery(event.target.value);
            }}
            onBlur={() =>
              setTimeout(
                () => setSearchResult({ query: "", targets: [] }),
                GRAPH_TARGET_RESULTS_DISMISS_MS,
              )
            }
            placeholder="Search a person or company…"
            className="h-9 w-56 text-sm"
            aria-label="Warm path target"
          />
          {results.length > 0 ? (
            <ul className="absolute z-10 mt-1 w-56 rounded-lg border border-seam bg-panel py-1 shadow-lg">
              {results.map((target) => (
                <li key={target.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(target);
                    }}
                    className="flex w-full items-center gap-1 px-2.5 py-1.5 text-left text-sm text-paper hover:bg-wash/[0.05]"
                  >
                    {target.kind === "company" ? "🏢 " : ""}
                    {target.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <SubmitButton className="h-9 px-4 text-sm">Find path</SubmitButton>
      </form>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.paths && state.paths.length === 0 ? (
        <p className="text-sm text-fog">
          No thread reaches {state.targetLabel || "that target"} yet — capture
          more of the people around them.
        </p>
      ) : null}
      {state.paths?.map((path, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber/20 bg-amber/[0.04] px-3 py-2"
        >
          <PathChip label="You" kind="you" />
          {path.nodes.map((node) => (
            <span key={node.id} className="flex items-center gap-1.5">
              <MoveRight className="size-3 text-fog/60" aria-hidden />
              <PathChip label={node.label} kind={node.kind} />
            </span>
          ))}
          {onShowPath ? (
            <Button
              variant="ghost"
              size="xs"
              className="ml-auto"
              onClick={() => onShowPath(path.nodes.map((node) => node.id))}
            >
              <Crosshair aria-hidden />
              Show on graph
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
