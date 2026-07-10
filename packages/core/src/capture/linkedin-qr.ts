/**
 * LinkedIn QR code capture (docs/ideas.md; docs/checklist.md's "LinkedIn QR
 * format support", v1.4). A small, dependency-free pure function so
 * LinkedIn-URL detection is unit-testable without a camera or browser, and
 * behaves identically across Node (tests), the web app's BarcodeDetector,
 * and the mobile app's Hermes runtime. Regex-based rather than the `URL`
 * global so there's no reliance on a particular runtime's URL polyfill.
 *
 * Deliberately not re-exported from ./index.ts (the package barrel pulls in
 * zod + the Anthropic SDK); deep-import this module directly, same as
 * geo/geohash.ts and api/capture.ts.
 */

const LINKEDIN_PROFILE_URL_RE = /^https?:\/\/(www\.)?linkedin\.com\/in\/[^\s/?#]+/i;
const LINKEDIN_SHORTLINK_RE = /^https?:\/\/(www\.)?lnkd\.in\/[^\s/?#]+/i;

/**
 * Returns the scanned text, trimmed, if it's a LinkedIn profile URL
 * (linkedin.com/in/<slug>) or an lnkd.in shortlink — the two shapes
 * LinkedIn's own app/desktop QR codes encode. Returns null for anything else
 * (company/job pages, unrelated URLs, vCard text, phone numbers, garbage),
 * so callers fall through to their existing capture flow unchanged rather
 * than guessing at what a non-LinkedIn scan means.
 */
export function matchLinkedInProfileUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (LINKEDIN_PROFILE_URL_RE.test(trimmed) || LINKEDIN_SHORTLINK_RE.test(trimmed)) {
    return trimmed;
  }
  return null;
}
