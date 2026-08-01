"use client";

import { useEffect, useState } from "react";
import {
  listRelationshipTypesAction,
  type RelationshipTypeOption,
} from "@/lib/actions/relationship-types";

/** Lazily load the user's custom relationship types the first time the dialog
 *  opens (once), plus an appender for a type created inline. */
export function useRelationshipTypes(open: boolean): {
  customTypes: RelationshipTypeOption[];
  addType: (created: RelationshipTypeOption) => void;
  updateType: (updated: RelationshipTypeOption) => void;
} {
  const [customTypes, setCustomTypes] = useState<RelationshipTypeOption[] | null>(null);

  useEffect(() => {
    if (!open || customTypes !== null) return;
    let cancelled = false;
    listRelationshipTypesAction()
      .then((types) => {
        if (!cancelled) setCustomTypes(types);
      })
      .catch(() => {
        if (!cancelled) setCustomTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, customTypes]);

  function addType(created: RelationshipTypeOption): void {
    setCustomTypes((current) => [...(current ?? []), created]);
  }

  function updateType(updated: RelationshipTypeOption): void {
    setCustomTypes((current) =>
      (current ?? []).map((type) => (type.id === updated.id ? updated : type)),
    );
  }

  return { customTypes: customTypes ?? [], addType, updateType };
}
