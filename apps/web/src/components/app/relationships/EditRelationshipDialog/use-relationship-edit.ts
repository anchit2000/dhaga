"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { humanizePredicate } from "@dhaga/core";
import { updateRelationshipAction } from "@/lib/actions/relationships";
import type { RelationshipTypeOption } from "@/lib/actions/relationship-types";
import type { GraphTarget } from "@/lib/repo/graph-data";
import type { RelationshipEndpointKind } from "@/lib/repo/relationships";
import {
  buildPredicateOptions,
  type PredicateOption,
} from "../AddRelationshipDialog/predicate-options";
import { useRelationshipTypes } from "../AddRelationshipDialog/useRelationshipTypes";

export interface RelationshipEdit {
  options: PredicateOption[];
  /** The other end of the edge. Null while the user is retyping the name. */
  target: GraphTarget | null;
  setTarget: (target: GraphTarget | null) => void;
  selected: PredicateOption | null;
  setSelected: (option: PredicateOption | null) => void;
  flipped: boolean;
  toggleFlip: () => void;
  /** False while the form still matches the stored edge — nothing to save. */
  changed: boolean;
  error: string | null;
  pending: boolean;
  addType: (created: RelationshipTypeOption) => void;
  updateType: (updated: RelationshipTypeOption) => void;
  /** Return the form to the stored edge (dialog dismissed without saving). */
  reset: () => void;
  /** Write the edit; calls `onSaved` only when the server accepted it. */
  submit: (onSaved: () => void) => void;
}

/**
 * Draft state for one edge's edit: which node at the other end, which
 * predicate, which direction, and whether any of them has actually moved. The
 * picker speaks in source→target terms while the row speaks in stored terms,
 * so an edge stored other→viewer starts out "flipped" from this page's view;
 * the submit rebuilds the whole edge from the viewed node plus the draft,
 * exactly as the add dialog builds a new one.
 */
export function useRelationshipEdit({
  edgeId,
  open,
  sourceId,
  sourceKind,
  initialTarget,
  predicate,
  viewerIsSource,
}: {
  edgeId: string;
  open: boolean;
  /** The node whose page this is — the end that never changes. */
  sourceId: string;
  sourceKind: RelationshipEndpointKind;
  initialTarget: GraphTarget;
  predicate: string;
  viewerIsSource: boolean;
}): RelationshipEdit {
  const router = useRouter();
  const { customTypes, addType, updateType } = useRelationshipTypes(open);
  const initialFlipped = !viewerIsSource;
  const [target, setTarget] = useState<GraphTarget | null>(initialTarget);
  const [flipped, setFlipped] = useState(initialFlipped);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Predicate vocabulary follows the CURRENT target's kind, so swapping a
  // company for a person re-offers person predicates (same rule as the add
  // dialog); an extracted slug that is neither built-in nor a saved custom
  // type is humanized rather than leaving the picker blank.
  const options = buildPredicateOptions(customTypes, sourceKind, target?.kind ?? null);
  const stored: PredicateOption = options.find((option) => option.slug === predicate) ?? {
    slug: predicate,
    forward: humanizePredicate(predicate),
    custom: false,
  };
  const [selected, setSelected] = useState<PredicateOption | null>(stored);

  function submit(onSaved: () => void): void {
    if (!selected || !target) return;
    startTransition(async () => {
      const source = { id: sourceId, kind: sourceKind };
      const other = { id: target.id, kind: target.kind };
      const [src, dst] = flipped ? [other, source] : [source, other];
      const result = await updateRelationshipAction({
        edgeId,
        srcId: src.id,
        srcKind: src.kind,
        dstId: dst.id,
        dstKind: dst.kind,
        predicate: selected.slug,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      onSaved();
      router.refresh();
    });
  }

  return {
    options,
    target,
    setTarget,
    selected,
    setSelected,
    flipped,
    toggleFlip: () => setFlipped((value) => !value),
    changed:
      flipped !== initialFlipped ||
      selected?.slug !== predicate ||
      target?.id !== initialTarget.id,
    error,
    pending,
    addType,
    updateType,
    reset: () => {
      setTarget(initialTarget);
      setSelected(stored);
      setFlipped(initialFlipped);
      setError(null);
    },
    submit,
  };
}
