"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { addContactToEvent, createEvent, removeContactFromEvent } from "@/lib/repo/events";

export interface EventMembershipState {
  error?: string;
}

/** Both pages an attach/detach touches — the event and the person — plus home. */
function revalidateMembership(eventId: string, contactId: string): void {
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/events");
  revalidatePath("/app");
}

/** Attach an existing person to an existing event (idempotent). */
export async function attachContactToEventAction(
  eventId: string,
  contactId: string,
): Promise<EventMembershipState> {
  await requireUserId();
  if (!eventId || !contactId) return { error: "Missing event or person." };
  await addContactToEvent(eventId, contactId);
  revalidateMembership(eventId, contactId);
  return {};
}

/** Create a new event (group) and attach this person to it in one step — the
 *  "Create group" affordance in the contact-page picker. Returns the new id so
 *  the caller can revalidate/navigate. */
export async function createEventAndAttachAction(
  name: string,
  contactId: string,
): Promise<EventMembershipState & { eventId?: string }> {
  await requireUserId();
  const trimmed = name.trim();
  if (!trimmed || !contactId) return { error: "Give the group a name." };
  const eventId = await createEvent(trimmed);
  await addContactToEvent(eventId, contactId);
  revalidateMembership(eventId, contactId);
  return { eventId };
}

/** Detach a person from an event. */
export async function detachContactFromEventAction(
  eventId: string,
  contactId: string,
): Promise<EventMembershipState> {
  await requireUserId();
  if (!eventId || !contactId) return { error: "Missing event or person." };
  await removeContactFromEvent(eventId, contactId);
  revalidateMembership(eventId, contactId);
  return {};
}
