"use server";

import { revalidatePath } from "next/cache";
import { setStarred } from "@/lib/repo/contacts";
import { mutation } from "@/lib/actions/mutation";

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
  const contactId = String(formData.get("contactId") ?? "");
  const starred = formData.get("starred") === "true";
  if (!contactId) return { ok: false, error: "Missing contact." };
  const r = await mutation("toggleStar", () => setStarred(contactId, starred));
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
  revalidatePath("/app/saved");
  revalidatePath("/app");
  return { ok: true };
}
