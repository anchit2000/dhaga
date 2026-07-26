# Dhaga E2E tests (Playwright)

Headed, full-flow end-to-end tests for the `/app` product surface. Run these
before shipping anything user-facing — they exercise the real flows a person
uses (create/edit contacts, follow-ups, facts, groups, events, Ask Dhaga,
relationships, confirmations, referral) through a real browser.

## Quick start (local, self-contained)

```bash
cd apps/web
npm run test:e2e:install     # one-time: download the Chromium build
npm run test:e2e             # headed by default — watch it drive the app
```

`test:e2e` auto-starts a local dev server (`npm run dev`, embedded PGlite, no
external DB) and, on first run, **signs up** the test account (local mode skips
email verification). Nothing touches production. Each spec creates its own data
(prefixed `[e2e]`) so runs are independent and repeatable.

Useful variants:

```bash
npm run test:e2e:headed              # force headed even in CI
E2E_HEADLESS=1 npm run test:e2e      # unattended/background run (software GL)
npm run test:e2e:ui                  # Playwright UI mode (pick/debug tests)
npm run test:e2e -- contacts.spec    # one flow
npm run test:e2e:report              # open the HTML report after a run
```

## Credentials & config

All secrets come from **`apps/web/.env.e2e.local`** (gitignored — never
committed). Copy the keys below into it:

| var | meaning | default |
|---|---|---|
| `E2E_BASE_URL` | server the suite drives | `http://localhost:3000` |
| `E2E_EMAIL` / `E2E_PASSWORD` | primary account (all mutating flows) | the load-test user |
| `E2E_AI_EMAIL` / `E2E_AI_PASSWORD` | real account, for AI-gated flows / prod smoke | — |
| `E2E_USE_AI_ACCOUNT=1` | log in as the AI account instead of the primary | off |
| `E2E_HEADLESS=1` | run headless (else headed) | off |

The Playwright config loads `.env.e2e.local`, then `.env.local`.

## Running against a deployed server (staging / prod smoke)

```bash
E2E_BASE_URL=https://dhaga.app npm run test:e2e
```

When `E2E_BASE_URL` is not localhost the suite does **not** start a dev server —
point it at an already-running deployment. The account must already exist there;
for a Supabase-backed server seed it first:

```bash
node --env-file=.env.vercel scripts/seed-dummy-graph.mjs recreate
```

Prefer the load-test account for a deployed run so mutations land on disposable
data. `[e2e]`-prefixed rows are safe to delete afterward.

## Layout

- `playwright.config.ts` — one config; headed default, auto dev-server for local,
  software-GL launch flags (headless `/app` otherwise crashes on WebGPU/WebGL).
- `auth.setup.ts` — logs in once → saves `e2e/.auth/user.json` (gitignored);
  every spec reuses that session.
- `fixtures.ts` — shared `test`/`expect`; aborts the voice-model CDN download so
  it can't hang a run.
- `helpers.ts` — `createContact`, `uniqueName`, selector helpers.
- `*.spec.ts` — one file per flow group.

## Notes

- The app has **no `data-testid`s**; specs use roles/labels/placeholders/text.
- `contacts.spec.ts` includes the **3-distinct-companies save** regression for
  the tenant-pool-exhaustion bug (PR #96) — it must save, not time out.
- CI does not yet run this suite (no e2e job in `ci.yml`); it's a local/manual
  pre-ship gate for now. Adding a CI job is a follow-up (needs a browser install
  step; PGlite mode needs no DB service).
