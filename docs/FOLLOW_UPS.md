# Open follow-ups

Non-blocking engineering follow-ups distilled from internal audit notes. None is
a known, currently-exploitable security vulnerability — tenant isolation was
reviewed (see [`SECURITY.md`](../SECURITY.md)); these are functional gaps,
hardening, and correctness items. Grouped by area.

## Follow-up calendar, notifications & reminders (2026-07-27)

Shipped on `feat/followups-calendar` (not an open item — recorded here because it
resolves part of the hosted email-job fan-out gap below):

- **`/app/calendar` view.** A month + agenda calendar of every open follow-up
  (`getCalendarFollowUps` in `lib/repo/reminders/calendar.ts`), built on
  **FullCalendar v6** (`@fullcalendar/react` + `daygrid` + `list` +
  `interaction`), themed to the amber tokens via `--fc-*` overrides — follow-ups
  are all-day single-date items, so only the dayGrid (month) and list (agenda)
  views are used. See [`LIBRARIES.md`](LIBRARIES.md) §12.
- **Drag-to-reschedule.** FullCalendar's `interaction` plugin (pointer + touch)
  moves a follow-up to a new day, persisted through the follow-up repo/action
  layer.
- **In-app notification bell.** A nav bell surfaces overdue + due-today counts and
  a capped preview list (`getNotificationSummary`), built on `isDueSoon` (= overdue
  OR due today). The badge means "act now", so it deliberately does **not** share
  the email's wider lead window — see the reminder email below.
  **Widened to a notification feed (2026-07-30).** `components/app/AppNav/NotificationBell/`
  now merges three kinds — derived follow-up reminders, derived upcoming important
  dates, and persisted `notifications` rows written when an extraction/enrichment
  job reaches a terminal state — under the header "Notifications" (was
  "Reminders"). The badge predicate above is unchanged apart from adding unread
  notifications and important dates **that land today**: a birthday six days out
  belongs in the panel, not on a badge that means "act now". Important-date rows
  carry no Done affordance (a birthday cannot be completed, only opened).
- **Daily due-follow-up reminder email.** New `lib/jobs/follow-up-reminders.ts`
  (`runFollowUpReminders`), wired into `/api/jobs/daily`. For each hosted tenant it
  reads `getDueFollowUpRemindersForUser()` inside `withUserDb`, and — if the tenant
  opted in (**reuses the morning-reminder toggle `morning_reminder_enabled`**; no
  new Settings toggle, which is out of this job's scope) and has ≥1 due item —
  emails a `"N follow-up(s) due soon"` summary (`followUpReminderHtml` +
  `emailShell`, contact names/actions HTML-escaped) via Resend. Skips tenants with
  nothing due (no empty emails), best-effort per tenant, and is a clean no-op in
  self-host without `DHAGA_OWNER_EMAIL` or Resend. **Per-tenant from day one**
  (mirrors `linkedin-export-reminders`); the three older email jobs have since been
  converted to the same shape — see "Hosted (Dhaga Cloud) multi-tenant" below. Pure
  subject/HTML/send-guard covered by `lib/jobs/follow-up-reminders.test.ts`.
  **Lead window (2026-07-30):** the email set is `isDueWithinEmailLeadWindow` —
  overdue, due today, **or due within `FOLLOW_UP_LEAD_DAYS` (3)**
  (`utils/constants/reminders.ts`). Before it, an item due in three days was never
  emailed at all; it first appeared once it was already late. Each row now carries
  an honest tag (`Overdue` / `Due today` / `Due tomorrow` / `Due in N days`).
  Email-only: `isDueSoon` and the bell's `dueToday`/`overdue` counts are unchanged.
- **Daily important-date reminder email (2026-07-30).** New
  `lib/jobs/important-date-reminders/` (`runImportantDateReminders`), wired into
  `/api/jobs/daily` after the follow-up sweep. Same per-tenant `withUserDb`
  fan-out and `sendEmail`-between-scopes hygiene. Opt-in via
  `important_date_reminders_enabled` (**default off** — important dates arrive in
  bulk from address-book imports the user never reviewed), lead time from
  `important_date_lead_days` (default 7). **Anti-spam:** the cron runs daily, so
  each occurrence gets at most **two** emails — one when it enters the lead window,
  one on the day itself. `state.ts` keeps a JSON array of
  `[contactId, label, occurrenceDate, stage]` tokens under
  `important_date_reminders_sent` (mirroring `linkedin_export_reminders_sent`);
  keying on the *occurrence* makes the next day's run a no-op, keying on the
  *stage* still lets the day-of nudge through, and "not yet sent" (rather than
  "daysUntil === leadDays") means a skipped cron run fires on the next run instead
  of losing the reminder. Past-occurrence tokens are pruned so the row cannot grow
  forever. Covered by `lib/jobs/important-date-reminders/index.test.ts`.

## Connection-hygiene sweeps (2026-07-26)

Two passes landed the connection-hygiene model — acquire a connection, use it for
a read (or a write), and **release it before any slow non-DB work** (LLM calls,
web search, webhooks); never hold one across slow I/O and never fan out multiple
`getDb()` checkouts concurrently. **PR #100** made every DB-mutating server action
run in ONE scoped connection (`mutation()` / short-scope `withUserDb`), made
mutation surfaces optimistic + resilient (canonical `FormError`/`toastError`,
never the error boundary), turned on session `cookieCache`, and made RLS scoping
transaction-local so the same code runs on the session pooler (5432) and the
transaction pooler (6543) — see [`SCALING.md`](SCALING.md) §1–§2. **This
follow-up PR** closed the remaining hold-across-slow-I/O and `getDb()` fan-out
gaps and the correctness/doc items below.

**Resolved in this follow-up sweep:**

- **`importContacts` no longer holds its connection across the webhook.** It takes
  a `skipWebhook` option and returns `{ created, skipped, format }`; the action
  emits `contacts.imported` AFTER `mutation()` releases the connection.
- **Worker-path metering confirmed short-scoped.** `lib/ai/enrich.ts` was already
  in the three-phase form (budget checkout released before the LLM/web-search
  call), matching `brief.ts` / `draft.ts` / `contact-extraction.ts` /
  `card-scan.ts` — no change needed.
- **Typed repo errors for create-with-unique-name.** `createNodeType` /
  `createRelationshipType` throw a typed `PreconditionError` (`lib/repo/errors.ts`)
  for the duplicate/invalid-name precondition; the actions surface that message
  but re-throw genuine infra failures into `mutation()`'s standard retry copy +
  server log.
- **EE `getDb()` fan-out + connect-retry gap.** `getPool()` is now wrapped at the
  pool level (`packages/ee/src/db/connect-retry.ts` `withConnectRetry`, patching
  `pool.query` + `pool.connect`), so every `drizzle(getPool())` read (admin /
  access-request / billing / referrals) inherits transient backoff+jitter. The
  admin/access-request `Promise.all` fan-outs (`dashboardCounts`, `listUsersPage`,
  `listSubscriptionsPage`, `listAccessRequestsPage`) now run on ONE
  `openAdminConnection()` client instead of 2–3 concurrent tenant-pool checkouts.
- **Semantic-search tombstone guard.** `PgVectorStore.search()` structurally
  excludes embeddings whose owning note/fact is soft-deleted (per-`ownerType`
  `EXISTS` guard) — defense-in-depth atop the transactional delete cascade.
- **`addSignalAsNoteAction` idempotency.** An upfront atomic claim
  (`UPDATE signals SET status='noted' WHERE id=$1 AND status<>'noted' RETURNING`)
  makes a double-click a no-op; the claim shares the action's transaction, so a
  later failure rolls it back for a clean retry.
- **`dismissCluster` race-free.** A single lock-free upsert (`appendToSettingArray`,
  `jsonb_agg(DISTINCT …)`) replaces the read-modify-write, covering the
  first-insert race too.
- **Telegram owner resolution deterministic.** Exact `DHAGA_OWNER_EMAIL` match
  first, else the earliest admin via `orderBy(asc(createdAt), asc(id))` so
  `.limit(1)` can't flip between requests.
- **Access-request email backfill.** An idempotent `DO $$…$$` block appended to the
  EE DDL lowercases pre-existing mixed-case `access_requests.email`, deduping PK
  collisions by `row_number()` before the `lower()` update.
- **Signals per-tenant sweep (hosted).** `runSignalDetection` loops each tenant
  through `withUserDb` in hosted mode (tenants enumerated from the non-RLS auth
  `user` table — NOT an RLS bypass), while self-host runs the single global scan
  unchanged; the LLM/web-search calls stay outside every DB scope. **Still needs
  live multi-tenant verification** (below).
- **RLS runtime integration test added** (`packages/ee` `rls-isolation.integration.test.ts`,
  skip-guarded on `DATABASE_URL`): asserts every `TENANT_TABLES` table isolates at
  runtime and that `user_id` is GUC-stamped, with a `pg_policies` check that fails
  the suite if a new tenant table is added without a spec.
- **Firecrawl retry/backoff** (2 retries, exponential backoff + jitter,
  transient-only) — closes the asymmetry with the Anthropic SDK's built-in retry.
- **Prompt-export path consistency.** The `signal-detection` prompt re-exports
  through the `llm/index.ts` barrel like every sibling prompt.
- **Stale pooling prose corrected** in `docs/DEPLOYING.md`, both self-hosting
  `.mdx` pages, `SECURITY.md`, and the tenant-isolation blog post (transaction-local
  scoping, no `RESET ALL`, both poolers; no session-mode boot guard /
  `DHAGA_ALLOW_TRANSACTION_POOLER` escape hatch anymore).

**Still open from the connection-hygiene work:**

- **Verify on a real pooled DB before Pro.** The EE integration suites
  (`tenant-reuse.integration.test.ts` and the new
  `rls-isolation.integration.test.ts`) are skip-guarded without `DATABASE_URL`;
  run them against a real session-pooled DB, and ideally the 6543 transaction
  pooler, before flipping `DATABASE_URL` at Supabase Pro. This is the single
  verification gate that also covers the transaction-scope and hosted-signals
  changes below.
- **Live multi-tenant verification of the hosted signals sweep.** The per-tenant
  loop is correct by construction and leaves self-host untouched, but was not run
  against a live multi-tenant RLS DB.
- **Pre-existing >150-line files nudged by the sweeps (directory-split still
  deferred — surgical scope; the splits would also collide with the hygiene
  edits):** `contacts.ts`, `import.ts`, `lib/hosted/gate.ts`,
  `components/app/home/TodaySuggestions.tsx`. (`lib/actions/notes.ts` was split
  into `lib/actions/notes/` — done.)
- **Optional (surfaced, not adopted):** cache the home `StatStrip` via
  `cachePerUserVersioned` (rejected — adds ~24h staleness to a decorative
  sparkline); a shared `OptimisticSwitch` to de-dupe the amber toggle markup.
- **Minor fan-out residuals (safe today):** `repo/relationships/list.ts`
  `listContactRelationships` is shape-fragile (would fan to 2 checkouts if ever
  called outside a scoped context; its only caller is RSC-pinned), and
  `repo/embeddings.ts` `countUnindexed` fans one vector lookup per row (only
  reached when `embeddingsEnabled()`, which is off on Vercel serverless).

## Hosted (Dhaga Cloud) multi-tenant

- **Daily-digest + morning-reminder + confirmations-digest email jobs ran on the
  default connection — RESOLVED (2026-07-30), and it was a live bug, not just an
  architectural gap.** `runMorningReminder`, `runDailyDigest` and
  `runConfirmationsDigest` read their own opt-in settings unscoped. Under
  `packages/ee` RLS an unscoped connection sets no `app.current_user_id`, so the
  `settings` read matched **zero rows**: `isMorningReminderEnabled()` /
  `isDailyDigestEnabled()` / `isConfirmationsDigestEnabled()` all answered `false`
  and `getSchedulePrefs()` silently returned defaults. **These three emails could
  never send for a hosted user, however the user had set their toggles.** All three
  now use the same shape as `follow-up-reminders` / `linkedin-export-reminders`:
  `emailEnabled()` guard → `hostedTenants()` → self-host (`null`) sweeps
  `ownerEmail()` once via `runOnGlobal`, else a **sequential** `for` loop over
  tenants, each sweep inside `withUserDb(t.id, …)`, `isDummyAccount` skipped,
  per-tenant `try`/`catch` + `logActionError` so one tenant failing never aborts the
  rest, and `sendEmail` called **between** scoped units so no connection is held
  across the network. Tenants still come from the non-RLS auth `user` table — no RLS
  bypass on tenant tables. Each returns `{ sent: number; skipped: "no_email" |
  "no_owner" | null }` (`/api/jobs/daily` just serialises it).
  **Per-tenant local-day idempotency (same change).** `lib/jobs/last-run.ts` adds
  `hasRunForLocalDay` / `markRanForLocalDay` over `getSetting`/`setSetting`, called
  inside the tenant scope so the record is per-user (settings' PK is
  `(user_id, key)` under EE RLS). The key is
  `<morning_reminder|daily_digest|confirmations_digest>_last_local_day` and the
  value is the JSON-encoded **latest** local day key only (`"2026-07-31"`,
  `localDayKey(now, prefs.timezone)`) — overwritten, not appended, so unlike the
  important-date / LinkedIn token arrays it is bounded by construction with nothing
  to prune. JSON-encoded (never `"|"`-joined) so any value the job did not write
  reads as "no record" instead of coincidentally matching. Keying on the
  recipient's **local** day, not the UTC day, is what makes a re-triggered cron a
  no-op for someone at UTC+14. An unreadable value counts as "not sent" — a corrupt
  row must fail towards delivering the opted-in email, never towards suppressing it
  forever.
  **Timezone gate.** The old `MORNING_REMINDER_HOURLY` compared against
  `schedule_prefs.utcOffsetMinutes` (a fixed browser-captured integer, default `0`)
  — an hour wrong under DST and wrong entirely for anyone who never opened the
  Daily-suggestions form — and was an hour-equality test, not a send record. It is
  replaced by `isLocalHour(now, prefs.timezone, MORNING_REMINDER_LOCAL_HOUR)` over
  the IANA `prefs.timezone` (`lib/time/zone.ts`), generalised across all three jobs
  behind `REMINDER_HOUR_GATE_ENV_VARS` (`utils/constants/reminders.ts`):
  `EMAIL_JOBS_HOURLY`, with `MORNING_REMINDER_HOURLY` still honoured **for one
  release** so an existing deploy does not silently change behaviour. The gate is
  **opt-in** — unset (the Vercel Hobby default of one cron a day, `"17 6 * * *"`,
  unchanged) the single run always sends, so it can never discard the only
  invocation the day gets; the day record is what prevents duplicates. Switching to
  hourly per-tenant-08:00 delivery is therefore a config change, not a rewrite.
  Covered by `lib/jobs/{morning-reminder,daily-digest,confirmations-digest}.test.ts`
  (32 cases), which model RLS by returning rows **only** inside a tenant scope and
  counting unscoped reads — so the old implementation fails them.
- **`hostedTenants()` vs the private copies — signals sweep RESOLVED, one copy
  left.** Every per-user email job — `linkedin-export-reminders`,
  `follow-up-reminders`, `important-date-reminders`, `morning-reminder` /
  `daily-digest` / `confirmations-digest` — fans out via the shared
  `lib/hosted/tenants.ts` helper (id + account email). `runSignalDetection` now
  does too: `lib/jobs/tenant-sweep.ts` wraps that helper as `hostedTenantIds()`
  (ids only, for jobs with no email to send) plus `forEachTenant(ids, label,
  sweep)` — the sequential `withUserDb` loop with per-tenant `try`/`catch` +
  `logActionError` — and the signals job consumes it, so its private probe +
  enumeration is gone. **`lib/jobs/messaging-flush` still carries its own id-only
  copy** (its self-host branch resolves the batch owner from the routing table
  rather than sweeping globally); fold it onto `tenant-sweep` next so there is
  exactly one tenant-enumeration path.
- **Residual: `getFreeBusy` is held inside its tenant scope — RESOLVED
  (2026-08-03), both callers converted.** `getFreeBusy` no longer interleaves its DB work
  with the provider call: it now runs in three phases (read the connection rows →
  call the providers holding nothing → flush the `needs_reconnect` /
  refreshed-token writes), and takes an optional `runScoped` so each DB phase gets
  its own short scope — the same DB → network → DB shape the calendar write-out
  already used. `lib/repo/calendar/free-busy-snapshot.ts` passes `withUserDb` per
  phase, so nothing is held across the provider on Home's refresh path;
  `src/lib/__tests__/calendar-free-busy-scope/` fails if that regresses.
  `lib/jobs/daily-digest.ts` was the last caller still calling it as
  `runScoped(() => getFreeBusy(range))` — the *caller* wrapping all three phases in
  one scope, which cancelled the split from the outside and left the digest sweep
  holding a connection across the provider call for every tenant with a calendar.
  It now passes `runScoped` as `getFreeBusy`'s second argument instead of wrapping
  the call; in self-host that argument is `runOnGlobal` (a passthrough), so that
  path is unchanged. **The lesson the fix owed a test:** the existing spec only
  ever called `getFreeBusy(WEEK, runScoped)` itself, so it proved the unit was
  *capable* of holding nothing and never that a caller did — which is why this
  survived. `calendar-free-busy-scope/daily-digest-no-held-connection.test.ts`
  now drives `runDailyDigest` itself through the same scope-depth trace (real
  `withUserDb`, real PGlite, fake provider) and fails on the old call shape.
- **Doc/comment updates the above change owed — DONE (2026-07-30 consolidated doc
  pass).** All four are closed: `lib/jobs/follow-up-reminders.ts`'s header no
  longer calls the other three jobs single-owner; `app/api/jobs/daily/route.ts`'s
  header now names `EMAIL_JOBS_HOURLY` (with the old name flagged as a one-release
  alias) and describes the per-recipient-zone day and last-run record across all
  three jobs; `docs/SELF_HOSTING.md` + `apps/web/content/docs/self-hosting/index.mdx`
  gained an `EMAIL_JOBS_HOURLY` row, a deprecation note on
  `MORNING_REMINDER_HOURLY`, and a "Daily email jobs" section that keeps the
  Hobby "no sub-daily cron" warning in view; `apps/web/.env.example` gained the
  same; `docs/TESTING.md` + its mirror describe the new flag and add §7aa for the
  hosted regression. **Still owed:** `apps/web/public/llms-full.txt` is generated
  and was deliberately not hand-edited — it regenerates from the docs above.
- **Telegram owner resolution.** Resolved (deterministic email-first + `orderBy`).
  Kept here only as a pointer; today's only impact was which admin's AI quota
  absorbed bot usage — no data-isolation consequence.

## Performance / scaling

- **Per-request fixed overhead (~1s floor, cross-region).** Every authenticated
  request pays a fixed setup cost before its query runs. Two of the original three
  contributors are now addressed: session validation is `cookieCache`d (PR #100)
  and `RESET ALL` is gone from the release path. The remaining levers are broad
  infra changes, not per-endpoint fixes: (1) keep the tenant pool warm (raise
  `idleTimeoutMillis` or add a keepalive) so steady traffic stops paying the
  connect handshake — weighed against the max-15-backend Supabase cap; (2)
  co-locate the Vercel function region with the DB region to cut the round-trip
  base latency (the US-function → Sydney-DB hop flagged in [`SCALING.md`](SCALING.md)).
- **Concurrent `getDb()` fan-out — resolved for the identified sites.** The write
  path (PR #100), the two search reads, and the EE admin/access-request fan-outs
  (this sweep) all run on one connection. Rule of thumb (now in
  [`SCALING.md`](SCALING.md) lever 2): resolve `getDb()` **once** per request and
  thread the handle; prefer one round-trip over a fan-out. Minor residuals noted
  in the connection-hygiene section above.

## Self-hosting / packaging

- **Relocate the admin/EE surface into `packages/ee`.** The "provably-100%-AGPL"
  proof (`.github/workflows/ci.yml`'s `verify-without-ee` job and
  `docs/SELF_HOSTING.md` "Level 2") deletes a hand-maintained list of admin files
  that physically live in `apps/web/src` but depend on removed EE code:
  `app/app/admin/`, `lib/actions/admin/`, `components/app/admin/`,
  `components/app/table/AdminTables.tsx`, and the `api/stripe` +
  `api/access-requests` routes. Every new admin/EE feature has to be added to that
  list by hand, and forgetting silently breaks the pure-AGPL build. Move the
  admin/EE UI + server actions into `packages/ee` and load them dynamically (the
  way `apps/web/src/lib/hosted/gate.ts` already loads EE *logic*), so Level 2
  collapses to just "delete `packages/ee`" with no stragglers to enumerate.
  **This shifts those files from AGPL to PolyForm Shield — a licensing decision,
  not just a refactor — so it needs an explicit owner call and belongs in its own
  PR, not a hygiene sweep.** (Level 1 self-hosting is unaffected either way.)

## Minor / enhancements

- **Prompt-export path consistency** — resolved (signal-detection prompt now flows
  through the `llm/index.ts` barrel). Firecrawl retry/backoff — resolved (see the
  connection-hygiene sweep above).
