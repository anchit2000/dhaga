"use client";

import { useActionState } from "react";
import { buildIndexAction, type IndexState } from "@/lib/actions/search";
import { SubmitButton } from "../SubmitButton";

/** Backfill button, shown only while indexable rows lack embeddings. */
export function IndexButton({ unindexed }: { unindexed: number }) {
  const [state, formAction] = useActionState<IndexState, FormData>(
    buildIndexAction,
    {},
  );

  if (state.indexed != null) {
    return (
      <p className="text-xs text-fog" role="status">
        Semantic index built — {state.indexed} item{state.indexed === 1 ? "" : "s"}{" "}
        embedded locally.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-fog">
        {unindexed} note{unindexed === 1 ? "" : "s"}/fact
        {unindexed === 1 ? "" : "s"} not in the semantic index yet. Indexing runs
        fully on this machine (first run downloads a ~35 MB model).
      </p>
      <SubmitButton className="h-8 px-3 text-xs">Build index</SubmitButton>
      {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
    </form>
  );
}
