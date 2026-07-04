"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { createSession, mergeSessions, renameSession, getSession } from "@/lib/repo/sessions";
import { sessionDigestData } from "@/lib/repo/digest";
import { sessionDigestHtml } from "@/lib/email/digest";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";

export interface SessionFormState {
  error?: string;
}

export async function createSessionAction(
  _previous: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the session a name." };
  const id = await createSession(name);
  redirect(`/app/sessions/${id}`);
}

export async function renameSessionAction(formData: FormData): Promise<void> {
  await requireUserId();
  const sessionId = String(formData.get("sessionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!sessionId || !name) return;
  await renameSession(sessionId, name);
  revalidatePath(`/app/sessions/${sessionId}`);
  revalidatePath("/app/sessions");
}

export interface DigestState {
  sent?: boolean;
  error?: string;
}

export async function emailDigestAction(
  _previous: DigestState,
  formData: FormData,
): Promise<DigestState> {
  await requireUserId();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Missing session." };
  if (!emailEnabled()) {
    return { error: "Email is not configured (set RESEND_API_KEY)." };
  }
  const to = ownerEmail();
  if (!to) {
    return { error: "Set DHAGA_OWNER_EMAIL in .env.local to receive digests." };
  }
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found." };
  const people = await sessionDigestData(sessionId);
  if (people.length === 0) return { error: "Nobody in this session yet." };

  const result = await sendEmail({
    to,
    subject: `Your ${session.name} digest — ${people.length} ${people.length === 1 ? "person" : "people"}`,
    html: emailShell(`${session.name} — who you met`, sessionDigestHtml(people)),
  });
  return result.ok ? { sent: true } : { error: result.error };
}

export async function mergeSessionAction(formData: FormData): Promise<void> {
  await requireUserId();
  const fromId = String(formData.get("fromId") ?? "");
  const intoId = String(formData.get("intoId") ?? "");
  if (!fromId || !intoId || fromId === intoId) return;
  await mergeSessions(fromId, intoId);
  redirect(`/app/sessions/${intoId}`);
}
