"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guard";
import { createSession, mergeSessions, renameSession } from "@/lib/repo/sessions";

export interface SessionFormState {
  error?: string;
}

export async function createSessionAction(
  _previous: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the session a name." };
  const id = await createSession(name);
  redirect(`/app/sessions/${id}`);
}

export async function renameSessionAction(formData: FormData): Promise<void> {
  await requireSession();
  const sessionId = String(formData.get("sessionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!sessionId || !name) return;
  await renameSession(sessionId, name);
  revalidatePath(`/app/sessions/${sessionId}`);
  revalidatePath("/app/sessions");
}

export async function mergeSessionAction(formData: FormData): Promise<void> {
  await requireSession();
  const fromId = String(formData.get("fromId") ?? "");
  const intoId = String(formData.get("intoId") ?? "");
  if (!fromId || !intoId || fromId === intoId) return;
  await mergeSessions(fromId, intoId);
  redirect(`/app/sessions/${intoId}`);
}
