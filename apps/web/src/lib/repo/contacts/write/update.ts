import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, positions } from "@/lib/db/schema";
import { emitWebhook } from "@/lib/webhooks";
import type { ContactProfile } from "@dhaga/core";
import { contactValues, positionRows, resolvePositions } from "./positions";

/** Update an existing contact from the edit form. Positions are the source of
 *  truth, so they're replaced wholesale (the form submits the full list —
 *  extraction-derived jobs included, since getContactProfile renders them like
 *  any other row). They come back without a receipt: a row the user saw and
 *  kept is now user-entered, so no later note deletion can remove it. */
export async function updateContact(id: string, input: ContactProfile): Promise<void> {
  const db = await getDb();
  const resolved = await resolvePositions(input.positions);
  const values = contactValues(input, resolved);
  await db.transaction(async (tx) => {
    if (resolved.length === 0) {
      // Guard against silent data loss: an empty positions list is far more
      // often the client filter dropping a half-typed row (blank title+company,
      // e.g. the combobox input-clear bug) than a deliberate "remove every job".
      // Never let it wipe a contact's saved employment or null the denormalised
      // title/company — update the rest and leave positions untouched. (An
      // explicit "remove all jobs" affordance can override this later.)
      const { title: _title, companyId: _companyId, ...rest } = values;
      await tx.update(contacts).set(rest).where(eq(contacts.id, id));
      return;
    }
    await tx.update(contacts).set(values).where(eq(contacts.id, id));
    await tx.delete(positions).where(eq(positions.contactId, id));
    await tx.insert(positions).values(positionRows(id, resolved));
  });
  await emitWebhook("contact.updated", { id, name: values.name });
}
