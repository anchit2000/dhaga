"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mutation } from "@/lib/actions/mutation";
import { createEvent, mergeEvents, renameEvent, getEvent, updateEventMeta } from "@/lib/repo/events";
import { eventDigestData } from "@/lib/repo/digest";
import { eventDigestHtml } from "@/lib/email/digest";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import {
  EVENT_COLOR_TOKENS,
  EVENT_EMOJIS,
  EVENT_TAG_MAX,
  EVENT_TAG_MAX_LENGTH,
} from "@/utils/constants/events";

export interface EventFormState {
  error?: string;
}

/** Only accept a colour token / emoji the palette actually offers; else clear it. */
function parseColor(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return EVENT_COLOR_TOKENS.includes(value) ? value : null;
}

function parseEmoji(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return EVENT_EMOJIS.includes(value) ? value : null;
}

/** Normalise user-authored tags: trim, lowercase, cap length, dedupe, cap count. */
function parseTags(raw: FormDataEntryValue[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const tag = String(entry).trim().toLocaleLowerCase().slice(0, EVENT_TAG_MAX_LENGTH);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
    if (tags.length >= EVENT_TAG_MAX) break;
  }
  return tags;
}

export async function createEventAction(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the event a name." };
  const emoji = parseEmoji(formData.get("emoji"));
  const color = parseColor(formData.get("color"));
  const r = await mutation("createEvent", () => createEvent(name, { emoji, color }));
  if (!r.ok) return { error: r.error };
  redirect(`/app/events/${r.data}`);
}

export async function renameEventAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!eventId || !name) return;
  const r = await mutation("renameEvent", () => renameEvent(eventId, name));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app/events");
}

/** Save a group's colour, emoji, and tags from the detail-page editor. */
export async function updateEventMetaAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;
  const meta = {
    color: parseColor(formData.get("color")),
    emoji: parseEmoji(formData.get("emoji")),
    tags: parseTags(formData.getAll("tags")),
  };
  const r = await mutation("updateEventMeta", () => updateEventMeta(eventId, meta));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app/events");
  revalidatePath("/app");
}

export interface DigestState {
  sent?: boolean;
  error?: string;
}

export async function emailDigestAction(
  _previous: DigestState,
  formData: FormData,
): Promise<DigestState> {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { error: "Missing event." };
  if (!emailEnabled()) {
    return { error: "Email is not configured (set RESEND_API_KEY)." };
  }
  const to = ownerEmail();
  if (!to) {
    return { error: "Set DHAGA_OWNER_EMAIL in .env.local to receive digests." };
  }

  // Read everything the email needs inside ONE short scoped connection, which
  // mutation() releases before the multi-second Resend call — never hold a
  // tenant connection across the external send (#92 pool saturation).
  const r = await mutation("emailDigest", async () => ({
    event: await getEvent(eventId),
    people: await eventDigestData(eventId),
  }));
  if (!r.ok) return { error: r.error };
  const { event, people } = r.data;
  if (!event) return { error: "Event not found." };
  if (people.length === 0) return { error: "Nobody in this event yet." };

  const result = await sendEmail({
    to,
    subject: `Your ${event.name} digest — ${people.length} ${people.length === 1 ? "person" : "people"}`,
    html: emailShell(`${event.name} — who you met`, eventDigestHtml(people)),
  });
  return result.ok ? { sent: true } : { error: result.error };
}

export async function mergeEventAction(formData: FormData): Promise<void> {
  const fromId = String(formData.get("fromId") ?? "");
  const intoId = String(formData.get("intoId") ?? "");
  if (!fromId || !intoId || fromId === intoId) return;
  const r = await mutation("mergeEvent", () => mergeEvents(fromId, intoId));
  if (!r.ok) throw new Error(r.error);
  redirect(`/app/events/${intoId}`);
}
