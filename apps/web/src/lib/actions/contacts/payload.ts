import { z } from "zod";
import { MutationError } from "@/lib/actions/mutation";

const idListSchema = z.array(z.string().min(1)).min(1);

/**
 * Parse the JSON `string[]` of contact ids a bulk/merge form submits, throwing
 * a MutationError (→ a clean user-facing message via mutation()) on anything
 * malformed or empty. Dedupes so the same id can't be double-counted.
 */
export function parseContactIds(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") throw new MutationError("Select at least one contact.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new MutationError("Could not read the selection — try again.");
  }
  const parsed = idListSchema.safeParse(json);
  if (!parsed.success) throw new MutationError("Select at least one contact.");
  return [...new Set(parsed.data)];
}
