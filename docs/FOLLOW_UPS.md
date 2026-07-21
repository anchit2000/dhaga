# Open follow-ups

Non-blocking engineering follow-ups distilled from internal audit notes. None is
a known, currently-exploitable security vulnerability — tenant isolation was
reviewed (see [`SECURITY.md`](../SECURITY.md)); these are functional gaps,
hardening, and correctness items. Grouped by area.

## Hosted (Dhaga Cloud) multi-tenant

- **Signals / watchlist generation in hosted mode.** The nightly
  signal-detection job runs on the shared, non-tenant-scoped connection, which
  row-level security neutralizes in hosted mode — so watchlist signals are not
  generated in Dhaga Cloud today (this works normally in single-tenant
  self-host). Implement a per-tenant sweep (loop each watched tenant through
  `withUserDb`) or stamp each signal's `user_id` from its contact's owner. Do
  **not** give the global sweep an RLS bypass — that is the one shape that would
  create a cross-tenant issue.
- **Runtime verification of RLS coverage.** `signals` is in `TENANT_TABLES` and
  the generated DDL is correct, but `packages/ee` has no live-Postgres test.
  Add an integration test that asserts RLS actually isolates every tenant table
  at runtime.
- **Telegram owner resolution.** `DHAGA_OWNER_EMAIL` doesn't deterministically
  pin the owner when more than one admin exists (`or(isAdmin, email=owner)`
  with `.limit(1)` and no tiebreaker). Match by email when it's set and add a
  deterministic `orderBy`. Today's only impact is which admin's AI quota absorbs
  bot usage — no data-isolation consequence.
- **Access-request email backfill.** Email case-normalization happens on write;
  before the first real hosted deployment, normalize any pre-existing mixed-case
  `accessRequests.email` rows so a resubmission can't create a duplicate.

## Data integrity / hardening

- **Semantic-search tombstone guarantee (defense-in-depth).** `semanticSearch`
  doesn't filter on `deletedAt`; it trusts embeddings to be removed in lockstep
  with tombstoning (which the delete cascades now do transactionally). Add a
  structural guard (join/filter) so deleted content can't resurface via search
  even if a future code path ever lets embeddings and tombstones diverge.
- **`addSignalAsNoteAction` idempotency.** No guard against a double-click
  creating duplicate notes/facts/edges. Needs `"use server"` action test
  infrastructure (auth/request-scope mocking) that the suite doesn't have yet.
- **`dismissCluster` locking.** Read-modify-write on a shared settings row with
  no lock; worst case a dismissed duplicate-name suggestion reappears once under
  a concurrent double-click. Low priority.

## Minor / enhancements

- **Firecrawl retry/backoff.** `firecrawl-client.ts` has no retry on transient
  failures (asymmetric with the Anthropic SDK's built-in retry). Enhancement,
  not a defect.
- **Prompt-export path consistency.** `signal-detection.ts`'s prompt export
  bypasses the normal `llm/index.ts` re-export path (works; purely stylistic).
