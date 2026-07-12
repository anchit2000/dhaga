"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { createEvent, mergeEvents, renameEvent, getEvent } from "@/lib/repo/events";
import { eventDigestData } from "@/lib/repo/digest";
import { eventDigestHtml } from "@/lib/email/digest";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";

export interface EventFormState {
  error?: string;
}

export async function createEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the event a name." };
  const id = await createEvent(name);
  redirect(`/app/events/${id}`);
}

export async function renameEventAction(formData: FormData): Promise<void> {
  await requireUserId();
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!eventId || !name) return;
  await renameEvent(eventId, name);
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app/events");
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
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { error: "Missing event." };
  if (!emailEnabled()) {
    return { error: "Email is not configured (set RESEND_API_KEY)." };
  }
  const to = ownerEmail();
  if (!to) {
    return { error: "Set DHAGA_OWNER_EMAIL in .env.local to receive digests." };
  }
  const event = await getEvent(eventId);
  if (!event) return { error: "Event not found." };
  const people = await eventDigestData(eventId);
  if (people.length === 0) return { error: "Nobody in this event yet." };

  const result = await sendEmail({
    to,
    subject: `Your ${event.name} digest — ${people.length} ${people.length === 1 ? "person" : "people"}`,
    html: emailShell(`${event.name} — who you met`, eventDigestHtml(people)),
  });
  return result.ok ? { sent: true } : { error: result.error };
}

export async function mergeEventAction(formData: FormData): Promise<void> {
  await requireUserId();
  const fromId = String(formData.get("fromId") ?? "");
  const intoId = String(formData.get("intoId") ?? "");
  if (!fromId || !intoId || fromId === intoId) return;
  await mergeEvents(fromId, intoId);
  redirect(`/app/events/${intoId}`);
}
