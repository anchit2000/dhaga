#!/usr/bin/env sh
# Portable daily-jobs trigger — the same endpoint Vercel Cron calls, so moving
# off Vercel is a scheduler change, not a code change. Point ANY scheduler at
# this: a system crontab line, a GitHub Actions schedule, or a container sidecar.
#
#   Env: DHAGA_BASE_URL (e.g. https://your-app.example), CRON_SECRET
#   Run: DHAGA_BASE_URL=... CRON_SECRET=... ./scripts/run-daily-jobs.sh
#
# Example crontab (06:17 UTC daily, matching apps/web/vercel.json):
#   17 6 * * * DHAGA_BASE_URL=https://your-app CRON_SECRET=xxx /path/to/scripts/run-daily-jobs.sh
set -eu
: "${DHAGA_BASE_URL:?set DHAGA_BASE_URL to your deployment's base URL}"
: "${CRON_SECRET:?set CRON_SECRET to the same value the app uses}"
curl -fsS -X GET "${DHAGA_BASE_URL%/}/api/jobs/daily" \
  -H "Authorization: Bearer ${CRON_SECRET}"
