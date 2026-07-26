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

## Reporting a vulnerability

Please report suspected vulnerabilities **privately** — email
**admin@ekasmi.com** — rather than opening a public issue, and give us a
reasonable window to fix before any disclosure. We aim to acknowledge within
3 business days.

## Advisories

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
