import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { isAuthoredContact } from "@/lib/repo/sync/authored";

/**
 * How many contacts a bulk seed would actually hand the user — the size of
 * `GET /api/export/vcard?scope=authored`, which is what decides whether the
 * contact-sync settings offer that download at all.
 *
 * Counted by running the SAME predicate the push and the seed export filter on
 * (@/lib/repo/sync/authored) over the same rows, rather than a COUNT(*) with a
 * hand-written WHERE. A SQL-shaped second copy of "authored" is the drift that
 * predicate exists to prevent: the visible symptom would be a button promising
 * 700 contacts that downloads 412, and the invisible one a button that never
 * appears for someone who does have people to seed.
 *
 * Lives here rather than in repo/sync because that module is the machinery of a
 * SYNC RUN, where every step takes its connection as an argument so a batch
 * cannot fan out (repo/sync/index.ts, and the guard in
 * __tests__/sync/db-scope.guard.test.ts). This is a single settings-page read,
 * so it follows the convention of its neighbours here and resolves the
 * request-pinned connection itself — one more read on the scope the render
 * already holds, not a new checkout.
 */
export async function countAuthoredContacts(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ source: contacts.source, name: contacts.name })
    .from(contacts);
  return rows.filter(isAuthoredContact).length;
}
