"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { setStarred } from "@/lib/repo/contacts";

export interface ToggleStarResult {
  ok: boolean;
  error?: string;
}

/**
 * Star / unstar a contact. Optimistic on the client (StarButton); this
 * revalidates every surface that shows the star — the contact page, the People
 * list, the Saved page, and the home Starred tile.
 */
export async function toggleStarAction(
  _previous: ToggleStarResult,
  formData: FormData,
): Promise<ToggleStarResult> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const starred = formData.get("starred") === "true";
  if (!contactId) return { ok: false, error: "Missing contact." };
  try {
    await setStarred(contactId, starred);
  } catch (error) {
    // PII-free: log only the error code, never contact data.
    console.error("[action:toggleStar] failed", { code: (error as { code?: unknown } | null)?.code });
    return { ok: false, error: "Couldn't update — please try again." };
  }
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
  revalidatePath("/app/saved");
  revalidatePath("/app");
  return { ok: true };
}
