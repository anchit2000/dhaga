# Security

Dhaga is privacy-first and local-first. Security — especially keeping one
person's graph invisible to everyone else — is a core product property, not an
afterthought.

## How isolation works

- **Self-hosted installs are single-tenant.** Your contacts, notes, and
  everything derived from them live in a database you control. There is no
  central Dhaga server that reads your graph.
- **Hosted (Dhaga Cloud) tenant isolation** is enforced by Postgres row-level
  security, keyed to the authenticated user via a session-scoped setting, on a
  non-privileged database role (no `BYPASSRLS`) with `FORCE ROW LEVEL SECURITY`
  on every tenant table.
- **Receipts and deletion.** Every AI-derived fact links back to its source
  note. Deleting data cascades and tombstones across notes, facts, edges, and
  embeddings — transactionally, so nothing is left half-deleted.
- **Export anytime.** You can export your full graph (CSV / vCard / JSON)
  whenever you want. No lock-in.

## Reporting a vulnerability

Please report suspected vulnerabilities **privately** — email
**admin@ekasmi** — rather than opening a public issue, and give us a
reasonable window to fix before any disclosure. We aim to acknowledge within
3 business days.

## Advisories

- **2026-07 — signals table RLS coverage.** A proactive internal audit found
  that the `signals` table (used by the opt-in job-change / news watchlist) had
  not yet been added to hosted-mode row-level-security coverage. It was
  corrected so the table is tenant-isolated exactly like every other, and the
  surrounding tenant-isolation surface was reviewed at the same time. No user
  data was known to have been accessed.
