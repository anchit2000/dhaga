import { getDb } from "@/lib/db/request-scope";
import { cascadeForget } from "../mutations";

/** Forget many contacts — the full forgetContact cascade for each, in ONE
 *  transaction so the batch is all-or-nothing (a later failure can't leave a
 *  half-deleted contact behind). */
export async function forgetContacts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const id of ids) await cascadeForget(tx, id);
  });
}
