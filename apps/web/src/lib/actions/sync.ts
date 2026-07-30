"use server";

import { revalidatePath } from "next/cache";
import { MULTI_FIELDS, SCALAR_FIELDS } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { mutation } from "@/lib/actions/mutation";
import { resolveSyncConflict } from "@/lib/repo/sync";
import { SYNC_CONFLICT_CHOICES } from "@/utils/constants/sync";
import type { SyncField } from "@dhaga/core";
import type { SyncConflictChoice } from "@/utils/constants/sync";

const SYNC_FIELDS: readonly SyncField[] = [...SCALAR_FIELDS, ...MULTI_FIELDS];

function parseField(value: FormDataEntryValue | null): SyncField | null {
  return SYNC_FIELDS.find((field) => field === value) ?? null;
}

function parseChoice(value: FormDataEntryValue | null): SyncConflictChoice | null {
  return SYNC_CONFLICT_CHOICES.find((choice) => choice === value) ?? null;
}

/**
 * Settle one persisted sync conflict — the surface that makes "nothing is
 * destroyed" true. Keeping Dhaga's value writes it back onto the contact; the
 * NEXT sync then carries it to the phone on its own, because Dhaga has become
 * the side that moved (see repo/sync/conflicts.ts).
 *
 * Returns the useOptimisticList contract: null on success, a message on
 * failure, so the row rolls back with a Retry toast instead of dumping the user
 * into the error boundary.
 */
export async function resolveSyncConflictAction(formData: FormData): Promise<string | null> {
  const linkId = String(formData.get("linkId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const field = parseField(formData.get("field"));
  const choice = parseChoice(formData.get("choice"));
  if (!linkId || !field || !choice) return "That conflict is no longer valid.";

  const result = await mutation("resolveSyncConflict", async () =>
    resolveSyncConflict(await getDb(), { linkId, field, choice }),
  );
  if (!result.ok) return result.error;
  // Already gone — resolved in another tab, or cleared by a sync that ran in
  // between. Say so rather than reporting a decision that was never applied.
  if (!result.data) return "That conflict was already resolved.";

  revalidatePath("/app/sync/conflicts");
  if (contactId) revalidatePath(`/app/people/${contactId}`);
  return null;
}
