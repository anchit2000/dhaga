/** Already carries a scheme — http:, https:, mailto:, tel:, anything. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/** Looks like a host (optionally with a path): a dot, no whitespace, no "@". */
const LOOKS_LIKE_HOST = /^[^\s@]+\.[^\s@]{2,}(\/\S*)?$/;

/**
 * Give a bare domain the scheme a URL input demands.
 *
 * Cards print their website as `pune.stpi.in`, not `https://pune.stpi.in`, so
 * that is what the scan extracts — and the contact form's `type="url"` field
 * then refused to submit ("Please enter a URL") with no way to tell which field
 * was at fault. Every card with a plain-domain website hit it.
 *
 * Anything that already has a scheme, or doesn't look like a host, is returned
 * untouched — this fixes an obvious case, it does not try to repair junk.
 */
export function withUrlScheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || HAS_SCHEME.test(trimmed)) return trimmed;
  return LOOKS_LIKE_HOST.test(trimmed) ? `https://${trimmed}` : trimmed;
}
