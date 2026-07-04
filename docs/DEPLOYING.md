# Deploying Dhaga

> **Just want to self-host for yourself, with no Dhaga Cloud features
> (billing, admin panel, invite-only signup)?** Read
> [SELF_HOSTING.md](SELF_HOSTING.md) first — it's simpler than this whole
> file and you can skip the "Hosted-mode extras" section below entirely.

Two very different things deploy from this repo today:

1. **The landing page** (`/`) — static, deploys anywhere, zero config.
2. **The app** (`/app`, `/api`) — stores data in an **embedded database
   (PGlite) on the server's filesystem**. That single fact decides where you
   can run it.

> **⚠ Read this first:** the default storage is an embedded database on the
> server's filesystem — great on a laptop/VPS, impossible on serverless
> (read-only, ephemeral, many instances). **To run the app on Vercel, set
> `DATABASE_URL` to a hosted Postgres** (Neon/Supabase free tiers work; the
> database must support `CREATE EXTENSION vector`). With it set, the app
> uses hosted Postgres everywhere; without it, the embedded DB — and on
> serverless only the landing page + waitlist (email fallback) function.

## Option A — Vercel

1. Import the GitHub repo at vercel.com → framework auto-detects Next.js.
2. Set **Root Directory** to `apps/web` and keep the default build command.
3. Env vars:
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DHAGA_OWNER_EMAIL` — emails +
     the waitlist's fallback path.
   - `DATABASE_URL` — hosted Postgres (create a free Neon or Supabase
     project, copy its connection string). **Without this, `/app` cannot
     store anything on Vercel**; with it, the full app works.
   - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — once `DATABASE_URL` is set.
   - `ANTHROPIC_API_KEY` — AI features.
   - `DHAGA_EMBEDDINGS=off` recommended on Vercel for now: the local
     embedding model (~100 MB of native runtime) is a poor fit for
     serverless functions; search falls back to keyword matching.
4. Deploy. Add your domain under Settings → Domains.

### Hosted-mode extras (Dhaga Cloud only — skip for plain self-hosting)

Add these on top of the above only if you want invite-gated signup, the
admin panel, and Stripe billing. See [SELF_HOSTING.md](SELF_HOSTING.md) for
what each of these actually turns on, and how to create your first admin
account once it's live.

- `DHAGA_HOSTED_MODE=true` — the master switch; every EE feature stays off
  without it, regardless of whether the other vars below are set.
- `DHAGA_ADMIN_EMAILS` — comma-separated emails that bootstrap into admins
  on signup (see SELF_HOSTING.md's "Creating the first admin user").
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_ANNUAL`,
  `STRIPE_PRICE_LIFETIME` — from the Stripe Dashboard (test-mode keys while
  developing). Omit `STRIPE_SECRET_KEY` to run hosted mode without billing
  (e.g. a free beta) — the billing UI simply doesn't render without it.
- Register the webhook in Stripe pointing at
  `https://your-domain/api/stripe/webhook`, subscribed to at least
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`.
- `DATABASE_URL` is **mandatory** in hosted mode regardless of platform — the
  multi-tenant isolation is Postgres Row-Level Security, which the embedded
  PGlite database doesn't support.

## Option B — a single persistent server (the real deployment today)

Any Linux VPS (Hetzner/DigitalOcean/EC2) or PaaS with a volume
(Railway / Render / Fly.io). Requirements: Node 20+, a directory that
survives restarts, HTTPS in front.

```bash
git clone https://github.com/anchit2000/dhaga.git && cd dhaga
npm ci
npm run build
```

Create `apps/web/.env.local` (or export the vars in your process manager):

```
BETTER_AUTH_SECRET=<long random string, e.g. `openssl rand -hex 32`>
BETTER_AUTH_URL=https://dhaga.example.com
DHAGA_DATA_DIR=/var/lib/dhaga        # persisted dir OUTSIDE the repo
ANTHROPIC_API_KEY=sk-ant-...         # optional; enables AI features
DHAGA_AI_MONTHLY_CAP=500             # optional; default 25/month
NODE_ENV=production
```

Run it (systemd example — `pm2 start "npm run start" ` works too):

```ini
# /etc/systemd/system/dhaga.service
[Unit]
Description=Dhaga
After=network.target

[Service]
WorkingDirectory=/opt/dhaga
ExecStart=/usr/bin/npm run start
Restart=always
EnvironmentFile=/etc/dhaga.env

[Install]
WantedBy=multi-user.target
```

Put Caddy or nginx in front for HTTPS — required in production because the
session cookie is `Secure` (login will not stick over plain HTTP).

```
# Caddyfile — automatic HTTPS
dhaga.example.com {
    reverse_proxy localhost:3000
}
```

### Backups & migration

- **Backup** = copy the `DHAGA_DATA_DIR` directory (stop the service first),
  plus a periodic `curl -H "x-api-key: …" .../api/export/json` (create a
  personal access token from `/app/settings`).
- **Leaving** = the JSON/CSV/vCard export endpoints give you everything;
  no lock-in is a feature.

## Checklist before going live

- [ ] Random `BETTER_AUTH_SECRET`, correct `BETTER_AUTH_URL`
- [ ] `DHAGA_DATA_DIR` on persistent storage, owned by the service user
- [ ] HTTPS terminating in front of port 3000
- [ ] Backup cron for the data dir / JSON export
- [ ] `ANTHROPIC_API_KEY` set as a server env var only — never in client code
- [ ] Verified the app with [TESTING.md](TESTING.md) against the deployed URL

## What's deliberately not here yet

- **Docker image / compose** — planned (checklist §18).
- **Manual click-through verification of the Stripe checkout/webhook flow**
  — the code is typechecked/linted/built/tested, but nobody has run a real
  test-mode purchase against a live Stripe account yet.

## Already done (see SELF_HOSTING.md and the "Hosted-mode extras" section above)

- **Hosted Postgres (Supabase/Neon)** — `DATABASE_URL` switches the driver
  automatically; see Option A above.
- **Real user accounts, per-user API keys, multi-tenant RLS, billing, admin
  panel, early-access gating** — all built. Self-hosted instances run
  without any of the hosted-only pieces by default (open registration, no
  billing UI, no admin nav) — see [SELF_HOSTING.md](SELF_HOSTING.md).
