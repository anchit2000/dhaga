import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingIdentities, type MessagingIdentityRow } from "@/lib/db/schema";

/**
 * ROUTING-table access (messaging_identities): CROSS-TENANT, no user scope.
 * The webhook calls these BEFORE any tenant scope exists to resolve which
 * Dhaga user an inbound message belongs to, so every filter is by an EXPLICIT
 * user_id — this routing table has NO RLS (see schema/messaging.ts). Uses the
 * plain `getDb()` mechanism, mirroring api/telegram/route.ts::resolveOwnerUserId
 * which reads the `user` table cross-tenant with a bare `const db = await
 * getDb()` (no withUserDb, no scoped connection). In a webhook there is no
 * session, so getDb() resolves to the global connection just as it does there.
 */

/** Which Dhaga user a channel sender maps to, or null when the pair is unlinked. */
export async function resolveUserIdByIdentity(
  provider: string,
  externalId: string,
): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ userId: messagingIdentities.userId })
    .from(messagingIdentities)
    .where(
      and(
        eq(messagingIdentities.provider, provider),
        eq(messagingIdentities.externalId, externalId),
      ),
    )
    .limit(1);
  return row?.userId ?? null;
}

/**
 * Link (or re-link) a channel sender to a user; upsert on the (provider,
 * external_id) unique index. Column-target on-conflict is safe here because
 * this routing table's shape is identical in self-host and EE (it is NOT a
 * TENANT_TABLE, so EE never swaps its constraints — unlike settings/graph_layouts).
 */
export async function linkIdentity(input: {
  provider: string;
  externalId: string;
  externalName: string | null;
  userId: string;
}): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    insert into messaging_identities (id, provider, external_id, external_name, user_id, linked_at)
    values (${randomUUID()}, ${input.provider}, ${input.externalId}, ${input.externalName}, ${input.userId}, now())
    on conflict (provider, external_id)
    do update set
      user_id = excluded.user_id,
      external_name = excluded.external_name,
      linked_at = now()
  `);
}

/**
 * Every identity a user has linked (Settings → Messaging list). EXPLICIT
 * user_id filter — there is no RLS on this routing table to do it for us.
 */
export async function listIdentitiesForUser(userId: string): Promise<MessagingIdentityRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(messagingIdentities)
    .where(eq(messagingIdentities.userId, userId))
    .orderBy(desc(messagingIdentities.linkedAt));
}

/** Unlink one identity, scoped to its owner so a user can only remove their own. */
export async function unlinkIdentity(input: {
  userId: string;
  identityId: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(messagingIdentities)
    .where(
      and(
        eq(messagingIdentities.id, input.identityId),
        eq(messagingIdentities.userId, input.userId),
      ),
    );
}
