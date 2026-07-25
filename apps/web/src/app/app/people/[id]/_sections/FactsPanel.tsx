"use client";

import { useCallback, useState } from "react";
import { ExtractionStatus } from "@/components/app/contact/ExtractionStatus";
import { FactList } from "@/components/app/contact/FactList";
import type { FactWithReceipt } from "@/lib/repo/notes";
import type { ExtractionJobView } from "@/types";

/** A fact as it arrives over JSON: Response.json() stringifies the Date columns,
 *  so they come back as ISO strings and must be revived before FactList (which
 *  calls noteCreatedAt.toLocaleDateString()) renders them. */
type FactPayload = Omit<FactWithReceipt, "createdAt" | "deletedAt" | "noteCreatedAt"> & {
  createdAt: string;
  deletedAt: string | null;
  noteCreatedAt: string | null;
};

function reviveFact(fact: FactPayload): FactWithReceipt {
  return {
    ...fact,
    createdAt: new Date(fact.createdAt),
    deletedAt: fact.deletedAt ? new Date(fact.deletedAt) : null,
    noteCreatedAt: fact.noteCreatedAt ? new Date(fact.noteCreatedAt) : null,
  };
}

/**
 * Client shell for the Facts section. FactList renders from local state seeded
 * with the server-rendered facts; when the extraction stream reports a job
 * finished writing (onFacts), it refetches just this contact's facts instead of
 * the old whole-page router.refresh(). The server render stays authoritative —
 * any revalidatePath (a manual add/edit/delete of a fact) sends a fresh
 * initialFacts, which re-seeds this local copy (below) — so it never drifts.
 */
export function FactsPanel({
  contactId,
  initialJobs,
  initialFacts,
}: {
  contactId: string;
  initialJobs: ExtractionJobView[];
  initialFacts: FactWithReceipt[];
}): React.ReactElement {
  const [facts, setFacts] = useState<FactWithReceipt[]>(initialFacts);

  // Re-seed on every server re-render of this section. `initialFacts` only
  // changes identity on a real server render (a revalidation), never on a
  // client-only re-render, so this never clobbers a mid-session stream refetch.
  // Tracking the previous prop in state and adjusting during render (not in an
  // effect) is React's documented way to reset state from a changed prop.
  const [seededFacts, setSeededFacts] = useState(initialFacts);
  if (seededFacts !== initialFacts) {
    setSeededFacts(initialFacts);
    setFacts(initialFacts);
  }

  const refetchFacts = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/contacts/${contactId}/facts`, { cache: "no-store" });
      if (!response.ok) return;
      const { facts: payload } = (await response.json()) as { facts: FactPayload[] };
      setFacts(payload.map(reviveFact));
    } catch {
      // A failed refetch keeps the last-known facts; the next revalidation or
      // reload reconciles.
    }
  }, [contactId]);

  return (
    <>
      <ExtractionStatus contactId={contactId} initialJobs={initialJobs} onFacts={refetchFacts} />
      <FactList contactId={contactId} facts={facts} />
    </>
  );
}
