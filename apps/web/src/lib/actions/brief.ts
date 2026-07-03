"use server";

import { requireSession } from "@/lib/auth/guard";
import { generateBrief, type BriefResult } from "@/lib/ai/brief";

export async function generateBriefAction(
  _previous: BriefResult,
  formData: FormData,
): Promise<BriefResult> {
  await requireSession();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return { error: "Missing contact." };
  return generateBrief(contactId);
}
