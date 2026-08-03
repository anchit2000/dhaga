# Security

Dhaga is privacy-first and local-first. Security — especially keeping one
person's graph invisible to everyone else — is a core product property, not an
afterthought.

## How isolation works

- **Self-hosted installs are single-tenant.** Your contacts, notes, and
  everything derived from them live in a database you control. There is no
  central Dhaga server that reads your graph.
- **Hosted (Dhaga Cloud) tenant isolation** is enforced by Postgres row-level
  security, keyed to the authenticated user via a transaction-local setting
  (`set_config('app.current_user_id', …, true)`, applied inside each unit of
  work's own transaction and discarded at COMMIT), on a non-privileged database
  role (no `BYPASSRLS` or `SUPERUSER`) with `FORCE ROW LEVEL SECURITY` on every
  tenant table.
- **Receipts and deletion.** Every AI-derived fact links back to its source
  note. Deleting data cascades and tombstones across notes, facts, edges, and
  embeddings — transactionally, so nothing is left half-deleted.
- **Export anytime.** You can export your full graph (CSV / vCard / JSON)
  whenever you want. No lock-in.

## How isolation is verified

Describing a policy is not the same as proving it holds. Tenant isolation is
covered by an automated suite that runs against a real Postgres:

- **Every tenant-scoped table has its own isolation spec.** For each table, the
  suite writes a row as one synthetic tenant and then asserts three things: a
  privileged connection can see the row at all (so the test cannot pass
  vacuously), a second tenant's scoped connection sees **zero** rows, and the
  owning tenant sees exactly its own row with `user_id` stamped by the
  *database* default rather than by application code.
- **Coverage cannot drift silently.** A separate check that needs no database
  asserts the spec list is exactly the registry of tenant-scoped tables, so
  adding a table without an isolation spec fails the test suite rather than
  going unnoticed.
- **The database is asked what it actually enforces.** Against a live database
  the suite reads `pg_policies` and each table's `FORCE ROW LEVEL SECURITY`
  flag, rather than trusting that the schema migration did what it intended.
- **Self-hosters can run it too.** The same suite is runnable against your own
  disposable Postgres — see `docs/DEPLOYING.md`. It writes and deletes test
  rows, so it must never be pointed at a production database.

## Reporting a vulnerability

Please report suspected vulnerabilities **privately** — email
**admin@ekasmi.com** — rather than opening a public issue, and give us a
reasonable window to fix before any disclosure. We aim to acknowledge within
3 business days.

## Advisories

- **2026-08 — tenant-isolation test coverage drift (not a vulnerability).** An
  internal review found that 11 tenant-scoped tables added by later features —
  including goals, messaging sessions, and contact-sync links — had no
  row-isolation spec. These tables **were** protected: they are members of the
  tenant-table registry, so the schema pass had given each one a `user_id`
  column, `FORCE ROW LEVEL SECURITY`, and the same isolation policy as every
  other table. What was missing was the automated *proof* that the policy held.
  The gap persisted because the check that would have caught it only ran when a
  live database was configured, so it was skipped — silently — in ordinary test
  runs. All 11 now have specs, and every tenant-scoped table has been verified
  isolated against a real Postgres. The coverage check no longer needs a
  database, so a table added without a spec now fails the suite immediately.
  No user data was known to have been accessed, and no policy was found
  missing or misconfigured.
- **2026-07 — calendar OAuth state binding.** The calendar OAuth `state` is now
  bound to the initiating session's user id, and the callback rejects a state
  whose user doesn't match the current session — closing an OAuth-CSRF /
  connection-injection gap where an attacker's signed state and code could be
  replayed to save their calendar tokens under a victim's account.
- **2026-07 — signals table RLS coverage.** A proactive internal audit found
  that the `signals` table (used by the opt-in job-change / news watchlist) had
  not yet been added to hosted-mode row-level-security coverage. It was
  corrected so the table is tenant-isolated exactly like every other, and the
  surrounding tenant-isolation surface was reviewed at the same time. No user
  data was known to have been accessed.
- **2026-07 — superuser RLS bypass and pooler-detection gap.** The same audit
  found the boot-time role check tested only `rolbypassrls`, missing that a
  `SUPERUSER` role also bypasses row-level security unconditionally, and that
  transaction-mode pooler detection (which broke the session-scoped setting
  tenant isolation relied on at the time) only recognized Supabase's `:6543`
  port. The superuser gap is closed: the boot guard now rejects a connecting
  role with `BYPASSRLS` **or** `SUPERUSER`. The pooler-detection gap was
  superseded rather than patched: tenant scoping moved to a **transaction-local**
  setting (`set_config('app.current_user_id', …, true)` inside one
  `BEGIN … COMMIT`, which self-clears at COMMIT), which is safe on both session-
  and transaction-mode poolers — so the pooler-detection guard, and its
  `DHAGA_ALLOW_TRANSACTION_POOLER` escape hatch, were retired as no longer
  needed. No user data was known to have been accessed.
