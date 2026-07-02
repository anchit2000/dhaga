"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guard";
import { createSession } from "@/lib/repo/sessions";

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
