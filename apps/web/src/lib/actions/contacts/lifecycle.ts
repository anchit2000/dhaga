"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mutation } from "@/lib/actions/mutation";
import {
  forgetContact,
  mergeMentionedContact,
  promoteMentionedContact,
} from "@/lib/repo/contacts";

/** Full cascade delete — the UI confirms before submitting. */
export async function forgetContactAction(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  // Route through mutation() so the cascade delete runs inside ONE scoped
  // connection (no getDb() fan-out), and a transient failure toasts via the
  // ActionForm wrapper instead of the error boundary. redirect() stays outside.
  const result = await mutation("forgetContact", () => forgetContact(contactId));
  if (!result.ok) throw new Error(result.error);
  redirect("/app/people");
}

export async function promoteMentionedContactAction(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const result = await mutation("promoteMentionedContact", () =>
    promoteMentionedContact(contactId),
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
}

export async function mergeMentionedContactAction(formData: FormData): Promise<void> {
  const mentionId = String(formData.get("mentionId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  if (!mentionId || !targetId) return;
  const result = await mutation("mergeMentionedContact", () =>
    mergeMentionedContact(mentionId, targetId),
  );
  if (!result.ok) throw new Error(result.error);
  if (!result.data) return;
  revalidatePath("/app/people");
  redirect(`/app/people/${targetId}`);
}
