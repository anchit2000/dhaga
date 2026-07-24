#!/usr/bin/env node
/**
 * Seeds a handful of PENDING confirmations for the dummy load-test user so the
 * unified confirmations centre (/app/confirmations, PR #76) renders a realistic,
 * populated inbox for a docs screenshot. Covers a spread of types — two
 * entity_link (person + custom entity), subject_resolution, enrichment_match and
 * supplement — so the inbox shows the full variety of card shapes.
 *
 * Everything is scoped to the dummy account (id `dummy-loadtest-user`). Reads
 * carry an explicit `WHERE user_id = $1`; writes rely on the same RLS default
 * the real app writer uses (confirmations.user_id DEFAULTs to
 * current_setting('app.current_user_id')), which this session sets — exactly
 * like seed-dummy-graph.mjs. Postgres RLS (packages/ee tenant_isolation) then
 * makes it structurally impossible to read or touch any other tenant's rows.
 *
 * Every row inserted here uses a deterministic id prefixed `seed-confirm-`, and
 * the script DELETEs that prefix before inserting, so re-running is idempotent
 * (no duplicates) and never disturbs real confirmations or edge_suggestion
 * backfill rows.
 *
 * Prerequisite: the dummy graph must already be seeded (contacts to reference):
 *   node --env-file=.env.vercel scripts/seed-dummy-graph.mjs recreate
 *
 * Usage (from apps/web):
 *   node --env-file=.env.vercel scripts/seed-confirmations.mjs
 *
 * Deliberately raw `pg`, no drizzle/schema import — mirrors seed-dummy-graph.mjs.
 */
import { Pool } from "pg";

const DUMMY_USER_ID = "dummy-loadtest-user";
const DUMMY_EMAIL = "loadtest@dhaga.internal";
const ID_PREFIX = "seed-confirm-";

function firstName(name) {
  return (name ?? "").trim().split(/\s+/)[0] || (name ?? "");
}

/** A pickable inbox option built from a real contact row. sublabel is always a
 *  string or null (never undefined) so the Zod option schema still parses. */
function contactOption(contact) {
  const sublabel = contact.title
    ? contact.company_name
      ? `${contact.title} · ${contact.company_name}`
      : contact.title
    : contact.company_name ?? null;
  return { id: contact.id, label: contact.name, sublabel };
}

async function dummyUserExists(client) {
  const { rows } = await client.query('SELECT id FROM "user" WHERE id = $1', [DUMMY_USER_ID]);
  return rows.length > 0;
}

/** Pulls the real rows the confirmations will reference, all scoped to the
 *  dummy user. Contacts with a title/company sort first so the questions about
 *  work relationships read naturally. Notes/facts/entities are optional — the
 *  default dummy graph is seeded without notes, so we degrade gracefully. */
async function fetchContext(client) {
  const contacts = (
    await client.query(
      `SELECT c.id, c.name, c.title, co.name AS company_name
       FROM contacts c
       LEFT JOIN companies co ON co.id = c.company_id
       WHERE c.user_id = $1
       ORDER BY (c.title IS NULL), (c.company_id IS NULL), c.name
       LIMIT 24`,
      [DUMMY_USER_ID],
    )
  ).rows;
  const note =
    (await client.query(`SELECT id FROM notes WHERE user_id = $1 ORDER BY id LIMIT 1`, [DUMMY_USER_ID]))
      .rows[0] ?? null;
  const fact =
    (
      await client.query(
        `SELECT f.id, f.text, f.contact_id, c.name AS contact_name
         FROM facts f JOIN contacts c ON c.id = f.contact_id
         WHERE f.user_id = $1 ORDER BY f.id LIMIT 1`,
        [DUMMY_USER_ID],
      )
    ).rows[0] ?? null;
  const entities = (
    await client.query(`SELECT id, name FROM entities WHERE user_id = $1 ORDER BY name LIMIT 4`, [DUMMY_USER_ID])
  ).rows;
  return { contacts, note, fact, entities };
}

/** Builds the confirmation rows (payloads validated by @dhaga/core's
 *  confirmationPayloadSchema — the inbox parses every payload on read, so each
 *  must be complete). Returns rows in display order (newest first). */
function buildConfirmations({ contacts, note, fact, entities }) {
  const pick = (i) => contacts[i % contacts.length];
  const sourceNote = note?.id ?? null;

  // 1) entity_link (person): an ambiguous first name in a note about c0.
  const c0 = pick(0);
  const c1 = pick(1);
  const c2 = pick(2);
  const personName = firstName(c1.name);
  const entityLinkPerson = {
    id: `${ID_PREFIX}entity-link-person`,
    contactId: c0.id,
    sourceNoteId: sourceNote,
    payload: {
      type: "entity_link",
      question: `The note about ${c0.name} mentions "${personName}". Which contact is that?`,
      options: [contactOption(c1), contactOption(c2)],
      apply: {
        kind: "insert_edge",
        srcContactId: c0.id,
        predicate: "knows",
        objectName: personName,
        objectType: "person",
        entityTypeHint: null,
      },
    },
  };

  // 2) entity_link (custom entity): an ambiguous org/place mention.
  const c3 = pick(3);
  const entityName = entities[0]?.name ?? "Equinox SF";
  const entityOptions = entities.slice(1, 3).map((e) => ({ id: e.id, label: e.name, sublabel: null }));
  const entityLinkEntity = {
    id: `${ID_PREFIX}entity-link-entity`,
    contactId: c3.id,
    sourceNoteId: null,
    payload: {
      type: "entity_link",
      question: `Which "${entityName}" is ${c3.name} a member of?`,
      options: entityOptions,
      apply: {
        kind: "insert_edge",
        srcContactId: c3.id,
        predicate: "member_of",
        objectName: entityName,
        objectType: "entity",
        entityTypeHint: null,
      },
    },
  };

  // 3) subject_resolution: a bare reference the extractor couldn't pin to one
  //    contact. No single subject yet, so contactId stays null.
  const c4 = pick(4);
  const c5 = pick(5);
  const c6 = pick(6);
  const subjectResolution = {
    id: `${ID_PREFIX}subject-resolution`,
    contactId: null,
    sourceNoteId: sourceNote,
    payload: {
      type: "subject_resolution",
      question: `A note says someone "now reports to ${c6.name}". Which of your contacts is it?`,
      options: [contactOption(c4), contactOption(c5)],
      apply: {
        kind: "resolve_subject",
        predicate: "reports_to",
        dstType: "contact",
        dstId: c6.id,
        objectName: c6.name,
      },
    },
  };

  // 4) enrichment_match: a web-sourced fact awaiting a "is this really them?"
  //    confirmation. Reference a real fact id when one exists.
  const c7 = pick(7);
  const enrichSubjectId = fact?.contact_id ?? c7.id;
  const enrichSubjectName = fact?.contact_name ?? c7.name;
  const enrichSnippet = fact?.text
    ? fact.text.length > 70
      ? `${fact.text.slice(0, 67)}…`
      : fact.text
    : "VP of Engineering at Stripe";
  const enrichmentMatch = {
    id: `${ID_PREFIX}enrichment-match`,
    contactId: enrichSubjectId,
    sourceNoteId: null,
    payload: {
      type: "enrichment_match",
      question: `Web enrichment found "${enrichSnippet}" for ${enrichSubjectName}. Is this the same person?`,
      options: [
        { id: "src-linkedin", label: "linkedin.com/in/…", sublabel: "VP, Engineering · Stripe" },
        { id: "src-crunchbase", label: "Crunchbase profile", sublabel: "San Francisco Bay Area" },
      ],
      apply: { kind: "verify_fact", factId: fact?.id ?? `${ID_PREFIX}fact-unresolved` },
    },
  };

  // 5) supplement: a whole note extraction proposed for a contact. The
  //    extraction must satisfy noteExtractionSchema (snake_case predicate, etc.).
  const c8 = pick(8);
  const extraction = {
    facts: [
      { type: "role", text: "Now leads the platform team at Northwind Labs.", confidence: 0.9 },
      { type: "preference", text: "Prefers a quick call over long email threads.", confidence: 0.7 },
      { type: "personal", text: "Just moved back to Bengaluru.", confidence: 0.6 },
    ],
    relationships: [
      {
        subject: "contact",
        predicate: "works_at",
        object: "Northwind Labs",
        object_type: "company",
        entity_type_hint: null,
      },
    ],
    follow_ups: [{ action: "Send the Q3 partnership deck", due_hint: "next week" }],
    tags: ["partnerships", "platform"],
  };
  const supplement = {
    id: `${ID_PREFIX}supplement`,
    contactId: c8.id,
    sourceNoteId: sourceNote,
    payload: {
      type: "supplement",
      question: `A new note about ${c8.name} adds 3 facts, 1 relationship and a follow-up. Add them to this contact?`,
      options: [
        { id: "sup-f1", label: `Fact · ${extraction.facts[0].text}`, sublabel: null },
        { id: "sup-f2", label: `Fact · ${extraction.facts[1].text}`, sublabel: null },
        { id: "sup-r1", label: `Relationship · works_at ${extraction.relationships[0].object}`, sublabel: null },
        { id: "sup-u1", label: `Follow-up · ${extraction.follow_ups[0].action}`, sublabel: "next week" },
      ],
      apply: { kind: "apply_extraction", contactId: c8.id, extraction },
    },
  };

  return [entityLinkPerson, entityLinkEntity, subjectResolution, enrichmentMatch, supplement];
}

async function seed(client) {
  if (!(await dummyUserExists(client))) {
    console.error(
      `Dummy account (${DUMMY_EMAIL}) not found. Seed it first:\n` +
        `  node --env-file=.env.vercel scripts/seed-dummy-graph.mjs recreate`,
    );
    process.exit(1);
  }

  // Tenant-scoped from here: every read filters by user_id AND is filtered by
  // RLS; every write's user_id DEFAULTs from this same setting.
  await client.query("SELECT set_config('app.current_user_id', $1, false)", [DUMMY_USER_ID]);

  const context = await fetchContext(client);
  if (context.contacts.length === 0) {
    console.error("No contacts found for the dummy user — run seed-dummy-graph.mjs recreate first.");
    process.exit(1);
  }

  // Idempotent: drop this script's previous rows (RLS keeps this to the dummy
  // user; the prefix keeps it to rows this script created).
  const deleted = (await client.query(`DELETE FROM confirmations WHERE id LIKE $1`, [`${ID_PREFIX}%`])).rowCount;

  const rows = buildConfirmations(context);
  const now = Date.now();
  const referenced = new Set();
  const byType = {};
  for (const row of rows) {
    byType[row.payload.type] = (byType[row.payload.type] ?? 0) + 1;
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    // Stagger created_at so the inbox (newest first) shows them in build order.
    const createdAt = new Date(now - i * 7 * 60 * 1000);
    await client.query(
      `INSERT INTO confirmations (id, type, status, payload, source_note_id, contact_id, created_at)
       VALUES ($1, $2, 'pending', $3::jsonb, $4, $5, $6)`,
      [row.id, row.payload.type, JSON.stringify(row.payload), row.sourceNoteId, row.contactId, createdAt],
    );
    for (const option of row.payload.options ?? []) {
      // Only real contact/entity labels are meaningful names to report.
      if (!option.id.startsWith("src-") && !option.id.startsWith("sup-")) referenced.add(option.label);
    }
    if (row.contactId) {
      const subject = context.contacts.find((c) => c.id === row.contactId);
      if (subject) referenced.add(subject.name);
    }
  }

  console.log(`Deleted ${deleted} prior seed confirmation(s); inserted ${rows.length}.`);
  console.log("By type:", byType);
  console.log("Referenced contacts/entities:", [...referenced].join(", "));
  if (!context.note) console.log("Note: no notes in the dummy graph — source_note_id left NULL (not rendered).");
  if (!context.fact) console.log("Note: no facts in the dummy graph — enrichment_match uses a placeholder factId.");
  console.log("\nDone. View at /app/confirmations while logged in as", DUMMY_EMAIL);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Postgres/Supabase instance (.env.vercel).");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await seed(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
