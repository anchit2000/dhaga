"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/guard";
import { enrichContact, type EnrichResult } from "@/lib/ai/enrich";

export async function enrichContactAction(
  _previous: EnrichResult,
  formData: FormData,
): Promise<EnrichResult> {
  await requireSession();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return { error: "Missing contact." };
  const result = await enrichContact(contactId);
  revalidatePath(`/app/people/${contactId}`);
  return result;
}
