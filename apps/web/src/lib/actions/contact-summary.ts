"use server";

import { requireUserId } from "@/lib/auth/guard";
import type { NoteRow } from "@/lib/db/schema";
import { getContact } from "@/lib/repo/contacts";
import { listContactEvents } from "@/lib/repo/events";
import { listFacts, listNotes, type FactWithReceipt } from "@/lib/repo/notes";
import { CONTACT_SUMMARY_FACT_LIMIT, CONTACT_SUMMARY_NOTE_LIMIT } from "@/utils/constants/app";
import type { ContactMethod } from "@dhaga/core";

/**
 * Focused snapshot for the Home feed's contact detail Sheet — not the full
 * /app/people/[id] page. Dispatched on row click (per contact), not
 * prefetched for every feed row, so this lives behind a server action the
 * Sheet calls on demand (same on-demand-fetch shape as search's askAiAction).
 */

export interface ContactSummary {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  tags: string[];
  emails: ContactMethod[];
  phones: ContactMethod[];
  links: ContactMethod[];
  location: string | null;
  notes: NoteRow[];
  facts: FactWithReceipt[];
  events: { id: string; name: string; scannedAt: Date }[];
}

export interface ContactSummaryState {
  summary?: ContactSummary;
  error?: string;
}

export async function getContactSummaryAction(
  _previous: ContactSummaryState,
  formData: FormData,
): Promise<ContactSummaryState> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return { error: "Missing contact." };

  const detail = await getContact(contactId);
  if (!detail) return { error: "Contact not found." };

  const [notes, facts, events] = await Promise.all([
    listNotes(contactId),
    listFacts(contactId),
    listContactEvents(contactId),
  ]);

  return {
    summary: {
      id: detail.contact.id,
      name: detail.contact.name,
      title: detail.contact.title,
      companyName: detail.companyName,
      tags: detail.contact.tags,
      emails: detail.contact.emails,
      phones: detail.contact.phones,
      links: detail.contact.links,
      location: detail.contact.location,
      notes: notes.slice(0, CONTACT_SUMMARY_NOTE_LIMIT),
      facts: facts.slice(0, CONTACT_SUMMARY_FACT_LIMIT),
      events,
    },
  };
}
