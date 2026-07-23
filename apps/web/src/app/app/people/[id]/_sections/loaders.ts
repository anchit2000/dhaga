import { cache } from "react";
import { listNotes } from "@/lib/repo/notes";
import { listContactEvents } from "@/lib/repo/events";

/**
 * Per-request memoized loaders for the two queries consumed by more than one
 * Suspense boundary — notes feed both the Notes list and the Timeline; events
 * feed both the header group chips and the Timeline. `cache()` dedupes so
 * independent boundaries don't each re-run the same query against the shared
 * request-scoped connection.
 */
export const loadContactNotes = cache((contactId: string) => listNotes(contactId));
export const loadContactEvents = cache((contactId: string) =>
  listContactEvents(contactId),
);
