/**
 * Extra origins better-auth accepts on state-changing requests (the CSRF /
 * origin check), on TOP of what better-auth already trusts by default:
 *   - `BETTER_AUTH_URL` (the canonical base URL), and
 *   - every entry in the `BETTER_AUTH_TRUSTED_ORIGINS` env var, which
 *     better-auth reads natively — a comma-separated list of exact origins
 *     (`https://dhaga.app,https://www.dhaga.app`) or wildcard patterns
 *     (`https://dhaga-web-*.vercel.app`). That env var is how operators add
 *     the apex domain, extra custom domains, or a preview wildcard with no
 *     code change — see apps/web/.env.example.
 *
 * The one thing an env list can't cover is a Vercel PREVIEW deployment: each
 * gets a fresh, unpredictable hostname per build. Vercel injects that hostname
 * as `VERCEL_URL` (and the branch alias as `VERCEL_BRANCH_URL`), so we trust
 * those automatically — preview auth then works out of the box without a broad
 * `*.vercel.app` wildcard (which would trust every app on vercel.app). Only
 * added on preview deployments; production is served from `BETTER_AUTH_URL`.
 */
export function previewTrustedOrigins(): string[] {
  if (process.env.VERCEL_ENV !== "preview") return [];
  const origins: string[] = [];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  return origins;
}
