import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, positions } from "@/lib/db/schema";
import { emitWebhook } from "@/lib/webhooks";
import { profileFromExtracted } from "@dhaga/core";
import type { ContactProfile, ExtractedContact } from "@dhaga/core";
import type { ContactSource } from "@/utils/constants/app";
import { contactValues, positionRows, resolvePositions } from "./positions";

/**
 * Create a contact from the full editable profile. A newly-saved contact that
 * matches exactly one existing "mentioned" stub by name is promoted in place
 * (the stub gets its first real details) rather than duplicated. This is the
 * single choke point for the manual add form and any importer that carries
 * the rich shape.
 */
export async function createContactProfile(
  input: ContactProfile,
  source: ContactSource,
  // skipWebhook: bulk import fires one contacts.imported event, not one per row.
  options?: { skipWebhook?: boolean },
): Promise<string> {
  const db = await getDb();
  const resolved = await resolvePositions(input.positions);
  // TODO(search-index): route through getSearchIndex() (matchMode: "exact")
  const mentioned = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.source, "mentioned"), ilike(contacts.name, input.name.trim())))
    .limit(2);
  const id = mentioned.length === 1 ? mentioned[0].id : randomUUID();
  const values = contactValues(input, resolved);
  await db.transaction(async (tx) => {
    if (mentioned.length === 1) {
      await tx.update(contacts).set({ ...values, source }).where(eq(contacts.id, id));
      await tx.delete(positions).where(eq(positions.contactId, id));
    } else {
      await tx.insert(contacts).values({ id, ...values, source, tags: [] });
    }
    const rows = positionRows(id, resolved);
    if (rows.length > 0) await tx.insert(positions).values(rows);
  });
  if (!options?.skipWebhook) {
    await emitWebhook("contact.created", { id, name: values.name, source });
  }
  return id;
}

/**
 * Capture/extraction/import entry point. Keeps the lean ExtractedContact
 * signature every handler and test uses; lifts it into the rich profile (a
 * single current position, unlabeled methods) so both paths share one writer.
 */
export async function createContact(
  input: ExtractedContact,
  source: ContactSource,
  options?: { skipWebhook?: boolean },
): Promise<string> {
  return createContactProfile(profileFromExtracted(input), source, options);
}
