// Fully delete a demo account (rows + user). Handy for resetting a demo.
//   node --env-file=.env.vercel scripts/seed-domains/_cleanup.mjs demo-<slug>
import { Pool } from "pg";

const userId = process.argv[2];
if (!userId) {
  console.error("usage: _cleanup.mjs <userId>  (e.g. demo-real-estate)");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT set_config('app.current_user_id', $1, false)", [userId]);
  await client.query(`DELETE FROM notes WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM event_contacts WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM events WHERE user_id = $1`, [userId]);
  await client.query(
    `DELETE FROM positions WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
    [userId],
  );
  await client.query(`DELETE FROM contacts WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM companies WHERE user_id = $1`, [userId]);
  await client.query('DELETE FROM "user" WHERE id = $1', [userId]);
  await client.query("COMMIT");
  console.log(`✓ deleted ${userId}`);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("✗ failed:", e.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
