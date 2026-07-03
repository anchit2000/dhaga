# Deploying Dhaga

Two very different things deploy from this repo today:

1. **The landing page** (`/`) — static, deploys anywhere, zero config.
2. **The app** (`/app`, `/api`) — stores data in an **embedded database
   (PGlite) on the server's filesystem**. That single fact decides where you
   can run it.

> **⚠ Read this first:** on serverless platforms (Vercel, Netlify,
> Cloudflare) the filesystem is ephemeral and instances are many — **your
> graph would silently reset**. Until the hosted-Postgres driver swap lands
> (see checklist §3), the app tier needs a single persistent server: a VPS,
> a Docker host, Railway/Render/Fly with a mounted volume.

## Option A — Vercel (landing page now, app later)

Fine today if you only need the marketing site live; the `/app` routes will
work but **must not be trusted with real data** (ephemeral storage).

1. Import the GitHub repo at vercel.com → framework auto-detects Next.js.
2. Set **Root Directory** to `apps/web` and keep the default build command.
3. Set env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DHAGA_OWNER_EMAIL`.
   **The waitlist needs these on Vercel**: the embedded DB can't write to a
   serverless filesystem, so signups fall back to a notification email to
   `DHAGA_OWNER_EMAIL` (and signers still get their confirmation). Without
   them the form returns 503.
4. Deploy. Add your domain under Settings → Domains.

Don't set `DHAGA_PASSWORD` here until persistent storage exists — better that
`/app` stays unusable than that someone builds a graph that vanishes.

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
DHAGA_PASSWORD=<strong password — this is the only lock on your graph>
DHAGA_SESSION_SECRET=<long random string, e.g. `openssl rand -hex 32`>
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
  plus a periodic `curl -H "Cookie: dhaga_session=…" .../api/export/json`.
- **Leaving** = the JSON/CSV/vCard export endpoints give you everything;
  no lock-in is a feature.

## Checklist before going live

- [ ] Strong `DHAGA_PASSWORD` + random `DHAGA_SESSION_SECRET`
- [ ] `DHAGA_DATA_DIR` on persistent storage, owned by the service user
- [ ] HTTPS terminating in front of port 3000
- [ ] Backup cron for the data dir / JSON export
- [ ] `ANTHROPIC_API_KEY` set as a server env var only — never in client code
- [ ] Verified the app with [TESTING.md](TESTING.md) against the deployed URL

## What's deliberately not here yet

- **Docker image / compose** — planned with the self-host docs (checklist §18).
- **Hosted Postgres (Supabase/Neon)** — the schema is already
  Postgres-dialect; swapping PGlite for a hosted connection is a driver
  change in `apps/web/src/lib/db/index.ts`, and unlocks serverless hosting.
- **Multi-user auth / billing** — single-password instance for now.
