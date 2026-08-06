// Local-only, additive fixtures for the scheduling documentation screenshots.
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { resolve } from "node:path";

const EMAIL = process.env.SCREENSHOT_EMAIL ?? "codex-scheduling@local.test";
const db = new PGlite({
  dataDir: resolve(process.env.DHAGA_DATA_DIR ?? ".dhaga-data"),
  extensions: { vector, pg_trgm },
});
const ids = {
  company: "docs-scheduling-company",
  primary: "docs-scheduling-primary-contact",
  crowded: "docs-scheduling-crowded-contact",
  note: "docs-scheduling-weekend-note",
  weekend: "docs-scheduling-weekend-follow-up",
  confirmation: "docs-scheduling-weekend-confirmation",
  recurring: "docs-scheduling-recurring-follow-up",
  generalTask: "docs-scheduling-general-task",
  companyTask: "docs-scheduling-company-task",
  personTask: "docs-scheduling-person-task",
};

function nextWeekday(target) {
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let delta = (target - day.getUTCDay() + 7) % 7;
  if (delta === 0) delta = 7;
  day.setUTCDate(day.getUTCDate() + delta);
  return day.toISOString().slice(0, 10);
}

const saturday = nextWeekday(6);
const sundayDate = new Date(`${saturday}T00:00:00.000Z`);
sundayDate.setUTCDate(sundayDate.getUTCDate() + 1);
const sunday = sundayDate.toISOString().slice(0, 10);
const monday = nextWeekday(1);
const friday = nextWeekday(5);

const user = await db.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [EMAIL]);
if (user.rows.length === 0) throw new Error(`Local screenshot user not found: ${EMAIL}`);
const userId = user.rows[0].id;

await db.query(
  `INSERT INTO companies (id, name, domain, sector) VALUES ($1, $2, $3, $4)
   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, domain = EXCLUDED.domain`,
  [ids.company, "Dhaga Textiles", "dhaga-textiles.local", "Retail"],
);
for (const contact of [
  [ids.primary, "Mira Kapoor", "Mumbai, India", 3],
  [ids.crowded, "Kabir Shah", "Mumbai, India", 1],
]) {
  await db.query(
    `INSERT INTO contacts
      (id, name, emails, phones, links, tags, source, location, last_reached_out_at,
       reach_out_every_days, reach_out_recurrence_frequency,
       reach_out_recurrence_interval, reach_out_recurrence_weekday)
     VALUES ($1, $2, '[]', '[]', '[]', '[]', 'manual', $3, now(), 7, 'weekly', 1, $4)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location,
       last_reached_out_at = EXCLUDED.last_reached_out_at,
       reach_out_every_days = 7, reach_out_recurrence_frequency = 'weekly',
       reach_out_recurrence_interval = 1, reach_out_recurrence_weekday = EXCLUDED.reach_out_recurrence_weekday`,
    contact,
  );
}
await db.query(
  `INSERT INTO geocode_cache
    (query_key, query_text, lat, lng, display_name, resolved, provider)
   VALUES ('mumbai, india', 'Mumbai, India', 19.076, 72.8777, 'Mumbai, India', true, 'docs-fixture')
   ON CONFLICT (query_key) DO UPDATE SET lat = EXCLUDED.lat, lng = EXCLUDED.lng,
     display_name = EXCLUDED.display_name, resolved = true`,
);
await db.query(
  `INSERT INTO notes (id, contact_id, kind, body) VALUES ($1, $2, 'text', $3)
   ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, deleted_at = NULL`,
  [ids.note, ids.primary, "Reach out next weekend about the new handloom collection."],
);

const followUps = [
  [ids.generalTask, userId, null, null, "Review shop inventory", null, null, null, null, null],
  [ids.companyTask, userId, null, ids.company, "Prepare weekly team update", monday, "weekly", 1, 1, null],
  [ids.personTask, userId, ids.primary, null, "Send fabric samples", friday, null, null, null, null],
  [ids.recurring, userId, ids.primary, null, "Check in about the store launch", friday, "weekly", 1, 5, null],
  [ids.weekend, userId, ids.primary, null, "Reach out about the handloom collection", saturday, null, null, null, ids.note],
];
for (const row of followUps) {
  await db.query(
    `INSERT INTO follow_ups
      (id, user_id, contact_id, company_id, action, due_date, recurrence_frequency,
       recurrence_interval, recurrence_weekday, status, source_note_id)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, 'open', $10)
     ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, due_date = EXCLUDED.due_date,
       recurrence_frequency = EXCLUDED.recurrence_frequency,
       recurrence_interval = EXCLUDED.recurrence_interval,
       recurrence_weekday = EXCLUDED.recurrence_weekday, status = 'open'`,
    row,
  );
}
const payload = {
  type: "follow_up_date",
  question: `“Reach out about the handloom collection” is already scheduled for Saturday (${saturday}). Keep it there, or move it to Sunday (${sunday})?`,
  scheduledDate: saturday,
  alternativeDate: sunday,
  apply: { kind: "update_follow_up_date", followUpId: ids.weekend },
};
await db.query(
  `INSERT INTO confirmations (id, type, status, payload, source_note_id, contact_id)
   VALUES ($1, 'follow_up_date', 'pending', $2::jsonb, $3, $4)
   ON CONFLICT (id) DO UPDATE SET status = 'pending', payload = EXCLUDED.payload, resolved_at = NULL`,
  [ids.confirmation, JSON.stringify(payload), ids.note, ids.primary],
);
await db.query(
  `INSERT INTO settings (key, value) VALUES ('daily_suggestion_count', '1')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
);
await db.close();
console.log(JSON.stringify({ userId, ids, saturday, sunday }, null, 2));
