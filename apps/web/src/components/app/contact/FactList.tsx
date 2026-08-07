import { FACT_TYPES } from "@dhaga/core/src/schemas/extraction";
import type { FactWithReceipt } from "@/lib/repo/notes";
import { FactListClient } from "./FactListClient";

/** AI-derived facts, each with its receipt (the note it came from) — plus a
 *  manual "Add fact" path so the graph is usable without any extraction.
 *  FACT_TYPES is read here (server-safe) and handed to the client list as a
 *  prop, so the interactive layer never pulls @dhaga/core's runtime into the
 *  bundle. */
export function FactList({
  contactId,
  facts,
}: {
  contactId: string;
  facts: FactWithReceipt[];
}) {
  return <FactListClient contactId={contactId} facts={facts} factTypes={FACT_TYPES} />;
}
