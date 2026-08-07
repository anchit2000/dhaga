import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";

/** RLS makes these reads same-tenant checks in hosted deployments. */
export async function validateTaskAssociations(
  contactId: string | null,
  companyId: string | null,
): Promise<void> {
  const db = await getDb();
  if (contactId) {
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);
    if (!contact) throw new PreconditionError("Person not found.");
  }
  if (companyId) {
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (!company) throw new PreconditionError("Company not found.");
  }
}
