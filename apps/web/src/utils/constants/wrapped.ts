import type { WrappedCardFormat } from "@dhaga/core/src/api/wrapped";

/**
 * Network Wrapped — shared, contact-free "in review" card constants.
 * The card is server-rendered via next/og (satori), which has no access to
 * CSS custom properties, so the brand palette is inlined here as hex. Keep in
 * sync with the `--brand-*` declarations in the `.dark { ... }` block of
 * apps/web/src/app/globals.css (the marketing/default theme this card always
 * renders in, regardless of viewer theme). wrapped.test.ts asserts this stays
 * true. Only keys actually read by app/wrapped/og/card.tsx are listed —
 * don't add one back without a caller.
 */

/** Aspect ratios of the generated share image, in pixels. */
export const WRAPPED_CARD_SIZES: Record<
  WrappedCardFormat,
  { width: number; height: number }
> = {
  landscape: { width: 1200, height: 630 }, // OG / Twitter link unfurl
  square: { width: 1080, height: 1080 }, // IG / LinkedIn feed post
  story: { width: 1080, height: 1920 }, // IG / WhatsApp vertical story
};

export const WRAPPED_DEFAULT_FORMAT: WrappedCardFormat = "landscape";

/** Brand palette for the OG card (mirrors globals.css .dark --brand-*). */
export const WRAPPED_CARD_COLORS = {
  ink: "#101112",
  panel2: "#202325",
  seam: "#303437",
  paper: "#f4f0e8",
  fog: "#aeb2b2",
  amber: "#e2a44c",
} as const;

/** How many category bars the card's mini-distribution shows. */
export const WRAPPED_CLUSTER_TOP_N = 5;

/** Public, unfurlable share-page base path: `/wrapped/<token>`. */
export const WRAPPED_SHARE_PATH = "/wrapped";

/** Dynamic OG image route: `/wrapped/og?...`. */
export const WRAPPED_OG_PATH = "/wrapped/og";

/** Query-param keys carried by the (public, contact-free) OG image URL. */
export const WRAPPED_OG_PARAMS = {
  format: "f",
  scopeLabel: "s",
  newPeople: "n",
  totalNetwork: "t",
  eventsAttended: "e",
  overdueFollowUps: "o",
  clusterKey: "ck",
  clusterCount: "cc",
  /** HMAC token covering the above, to prevent forged vanity cards. */
  token: "sig",
} as const;
