import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, notes, sessionContacts } from "@/lib/db/schema";
import {
  DECAY_AFTER_DAYS,
  STRENGTH_BANDS,
  STRENGTH_HALF_LIFE_DAYS,
  STRENGTH_RECENCY_WEIGHT,
  STRENGTH_SATURATION,
  STRENGTH_WINDOW_DAYS,
} from "@/utils/constants/app";
import type { StrengthLabel } from "@/utils/constants/app";

/**
 * Relationship decay + strength (BRD §6.7: own-graph data only — touches are
 * notes, session attendance, and explicit "I reached out"; never external
 * signals). Computed at read time; no nightly job, no stored score.
 */

export interface RelationshipStrength {
  score: number; // 0–100
  label: StrengthLabel;
}

/**
 * Recency (half-life decay since the last touch) blended with frequency
 * (interactions inside the trailing window, saturating) — so a strong-but-
 * fading relationship outranks one that was never active.
 */
export function scoreStrength(
  lastTouch: Date,
  recentInteractions: number,
  now: number = Date.now(),
): RelationshipStrength {
  const days = Math.max(0, (now - lastTouch.getTime()) / 86_400_000);
  const recency = 0.5 ** (days / STRENGTH_HALF_LIFE_DAYS);
  const frequency = Math.min(recentInteractions / STRENGTH_SATURATION, 1);
  const score = Math.round(
    100 *
      (STRENGTH_RECENCY_WEIGHT * recency +
        (1 - STRENGTH_RECENCY_WEIGHT) * frequency),
  );
  const band = STRENGTH_BANDS.find((entry) => score >= entry.min);
  return { score, label: (band ?? STRENGTH_BANDS[STRENGTH_BANDS.length - 1]).label };
}

export interface QuietContact {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  lastTouch: Date;
  strength: RelationshipStrength;
}

const lastTouch = sql<Date>`GREATEST(
  ${contacts.createdAt},
  COALESCE(${contacts.lastReachedOutAt}, ${contacts.createdAt}),
  COALESCE(MAX(${notes.createdAt}), ${contacts.createdAt}),
  COALESCE(MAX(${sessionContacts.scannedAt}), ${contacts.createdAt})
)`;

const windowStart = sql`now() - make_interval(days => ${STRENGTH_WINDOW_DAYS})`;

const recentInteractions = sql<number>`
  COUNT(DISTINCT ${notes.id}) FILTER (WHERE ${notes.createdAt} > ${windowStart})
  + COUNT(DISTINCT ${sessionContacts.sessionId}) FILTER (WHERE ${sessionContacts.scannedAt} > ${windowStart})
  + (CASE WHEN ${contacts.lastReachedOutAt} > ${windowStart} THEN 1 ELSE 0 END)
`;

/**
 * Decay detection: contacts with no touch in DECAY_AFTER_DAYS. Contacts with
 * a keep-in-touch cadence are excluded — the cadence feed already owns them.
 * Ordered strongest-first: the most valuable fading relationships surface at
 * the top of Home.
 */
export async function listQuietContacts(): Promise<QuietContact[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      lastTouch,
      recentInteractions,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(
      notes,
      and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)),
    )
    .leftJoin(sessionContacts, eq(sessionContacts.contactId, contacts.id))
    .where(isNull(contacts.reachOutEveryDays))
    .groupBy(contacts.id, companies.id)
    .having(sql`${lastTouch} < now() - make_interval(days => ${DECAY_AFTER_DAYS})`);
  return rows
    .map((row) => {
      const touched = new Date(row.lastTouch);
      return {
        id: row.id,
        name: row.name,
        title: row.title,
        companyName: row.companyName,
        lastTouch: touched,
        strength: scoreStrength(touched, Number(row.recentInteractions)),
      };
    })
    .sort(
      (a, b) =>
        b.strength.score - a.strength.score ||
        a.lastTouch.getTime() - b.lastTouch.getTime(),
    );
}
