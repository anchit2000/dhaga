"use server";

import { revalidatePath } from "next/cache";
import { PERSON_KINDS, type PersonKind } from "@dhaga/core";
import { mutation, MutationError } from "@/lib/actions/mutation";
import type { MutationResult } from "@/lib/actions/mutation";
import { setContactsPersonKind, setPersonKind } from "@/lib/repo/contacts";
import { parseContactIds } from "@/lib/actions/contacts/payload";

export interface SetPersonKindResult {
  ok: boolean;
  error?: string;
}

/** Reject anything that isn't one of the three kinds — a bad value would write
 *  a `person_kind` no query understands, and the row would then be suppressed
 *  or surfaced by accident rather than by a decision. */
function parseKind(value: FormDataEntryValue | null): PersonKind {
  const kind = String(value ?? "");
  if (!(PERSON_KINDS as readonly string[]).includes(kind)) {
    throw new MutationError("Unknown person kind.");
  }
  return kind as PersonKind;
}

/**
 * The user's ruling on one contact: "this is a person" / "this is not a
 * person". Writes `person_kind_by = 'user'` (see repo/contacts/person-kind.ts),
 * which the nightly sweep treats as a lock — so overruling Dhaga's guess is
 * permanent, not undone the next night.
 *
 * Revalidates the same surfaces as `toggleStarAction`: the contact page (the
 * chip's own provenance line), People (the "N hidden from suggestions" count),
 * and Home — every proactive tile there reads through `surfaceableContact`, so
 * the ruling has to change what Home shows on the very next render.
 */
export async function setPersonKindAction(
  _previous: SetPersonKindResult,
  formData: FormData,
): Promise<SetPersonKindResult> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return { ok: false, error: "Missing contact." };
  const r = await mutation("setPersonKind", async () => {
    await setPersonKind(contactId, parseKind(formData.get("kind")));
    return null;
  });
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
  revalidatePath("/app");
  return { ok: true };
}

/**
 * The same ruling across a People-table selection — the bulk-bar counterpart,
 * shaped like `bulkStarContactsAction` (FormData in, MutationResult out).
 *
 * It lives here rather than in actions/contacts/bulk.ts so the single and bulk
 * rulings share one validation and one docblock about the `'user'` lock; bulk.ts
 * is also at 148 lines, and splitting it into a directory to add this would be
 * a far wider change than the feature needs.
 */
export async function bulkSetPersonKindAction(
  formData: FormData,
): Promise<MutationResult<null>> {
  const idsRaw = formData.get("contactIds");
  const result = await mutation("bulkSetPersonKind", async () => {
    const kind = parseKind(formData.get("kind"));
    await setContactsPersonKind(parseContactIds(idsRaw), kind);
    return null;
  });
  if (result.ok) {
    revalidatePath("/app/people");
    revalidatePath("/app");
  }
  return result;
}
