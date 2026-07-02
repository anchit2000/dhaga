"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guard";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { addContactToSession, createSession } from "@/lib/repo/sessions";
import type { ExtractedContact } from "@dhaga/core";

export interface ContactFormState {
  error?: string;
}

function field(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function listField(formData: FormData, name: string): string[] {
  return String(formData.get(name) ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await requireSession();
  const name = field(formData, "name");
  if (!name) return { error: "Name is required." };

  const input: ExtractedContact = {
    name,
    title: field(formData, "title"),
    company: field(formData, "company"),
    location: field(formData, "location"),
    emails: listField(formData, "emails"),
    phones: listField(formData, "phones"),
    links: listField(formData, "links"),
  };
  const source = field(formData, "source") === "quick_add" ? "quick_add" : "manual";
  const id = await createContact(input, source);

  // Quick-add receipts: the pasted text becomes the contact's first note.
  const sourceText = field(formData, "sourceText");
  if (sourceText) await addNote(id, "capture_source", sourceText);

  const newSessionName = field(formData, "newSessionName");
  const sessionId =
    newSessionName != null
      ? await createSession(newSessionName)
      : field(formData, "sessionId");
  if (sessionId) await addContactToSession(sessionId, id);

  redirect(`/app/people/${id}`);
}
