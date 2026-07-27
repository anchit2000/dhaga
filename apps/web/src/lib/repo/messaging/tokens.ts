import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingLinkTokens } from "@/lib/db/schema";

/**
 * ROUTING-table access (messaging_link_tokens): CROSS-TENANT, no user scope —
 * account-linking tokens are minted from Settings and redeemed by the webhook
 * before any tenant scope exists. Same plain `getDb()` mechanism as
 * identities.ts / resolveOwnerUserId (no withUserDb, no scoped connection).
 */

/** Mint a short-lived, single-use linking token for a user (from Settings). */
export async function createLinkToken(input: {
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  await db.insert(messagingLinkTokens).values({
    token: input.token,
    userId: input.userId,
    expiresAt: input.expiresAt,
  });
}

/**
 * Redeem a token ATOMICALLY: a single UPDATE ... RETURNING both checks
 * (unused, unexpired) and marks it used, so a token cannot be consumed twice
 * even under concurrent webhook deliveries. Returns the owning user or null
 * when the token is unknown, already used, or expired.
 */
export async function consumeLinkToken(token: string): Promise<{ userId: string } | null> {
  const db = await getDb();
  const result = (await db.execute(sql`
    update messaging_link_tokens
    set used_at = now()
    where token = ${token} and used_at is null and expires_at > now()
    returning user_id
  `)) as unknown as { rows: Array<{ user_id: string }> };
  const row = result.rows[0];
  return row ? { userId: row.user_id } : null;
}

/**
 * The user's most recent still-valid token, for Settings to display/echo.
 * `expires_at > now()` compared against a JS Date matches the repo's lt/gt
 * timestamp convention (see extraction-jobs reaper).
 */
export async function getActiveTokenForUser(
  userId: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  const db = await getDb();
  const [row] = await db
    .select({ token: messagingLinkTokens.token, expiresAt: messagingLinkTokens.expiresAt })
    .from(messagingLinkTokens)
    .where(
      and(
        eq(messagingLinkTokens.userId, userId),
        isNull(messagingLinkTokens.usedAt),
        gt(messagingLinkTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(messagingLinkTokens.createdAt))
    .limit(1);
  return row ?? null;
}
