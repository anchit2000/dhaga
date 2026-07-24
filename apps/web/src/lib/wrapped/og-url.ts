import { SITE_URL } from "@/utils/constants/site";
import {
  WRAPPED_CARD_SIZES,
  WRAPPED_DEFAULT_FORMAT,
  WRAPPED_OG_PARAMS,
  WRAPPED_OG_PATH,
} from "@/utils/constants/wrapped";
import type { WrappedCardFormat, WrappedStats } from "@dhaga/core/src/api/wrapped";

/**
 * Pure, client-safe URL/param helpers for the Network Wrapped share image.
 * Deliberately free of `node:crypto` (that lives in ./sign.ts) so the browser
 * bundle can import this to build per-format image URLs without pulling any
 * server-only code. Everything here is CONTACT-FREE: counts, the scope label,
 * and the top-cluster CATEGORY only — never a person's name.
 */

/** The exact, signed set the OG card renders. Excludes `format` on purpose —
 *  the HMAC is format-independent so one signature validates every aspect. */
export interface WrappedCardParams {
  scopeLabel: string;
  newPeople: number;
  totalNetwork: number;
  eventsAttended: number;
  overdueFollowUps: number;
  clusterKey: string | null;
  clusterCount: number;
}

/** Project full owner stats down to the contact-free card params. */
export function statsToCardParams(stats: WrappedStats): WrappedCardParams {
  return {
    scopeLabel: stats.scopeLabel,
    newPeople: stats.newPeople,
    totalNetwork: stats.totalNetwork,
    eventsAttended: stats.eventsAttended,
    overdueFollowUps: stats.overdueFollowUps,
    clusterKey: stats.topCluster?.key ?? null,
    clusterCount: stats.topCluster?.count ?? 0,
  };
}

function toInt(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function normalizeFormat(value: string | null): WrappedCardFormat {
  return value && value in WRAPPED_CARD_SIZES
    ? (value as WrappedCardFormat)
    : WRAPPED_DEFAULT_FORMAT;
}

/** Assemble the (default absolute) OG image URL for one format. Pass
 *  `{ absolute: false }` for a same-origin relative URL (in-app <img>, which
 *  must resolve against the current host, not the canonical site). */
export function buildWrappedOgUrl(
  params: WrappedCardParams,
  sig: string,
  format: WrappedCardFormat,
  options: { absolute?: boolean } = {},
): string {
  const query = new URLSearchParams();
  query.set(WRAPPED_OG_PARAMS.format, format);
  query.set(WRAPPED_OG_PARAMS.scopeLabel, params.scopeLabel);
  query.set(WRAPPED_OG_PARAMS.newPeople, String(params.newPeople));
  query.set(WRAPPED_OG_PARAMS.totalNetwork, String(params.totalNetwork));
  query.set(WRAPPED_OG_PARAMS.eventsAttended, String(params.eventsAttended));
  query.set(WRAPPED_OG_PARAMS.overdueFollowUps, String(params.overdueFollowUps));
  query.set(WRAPPED_OG_PARAMS.clusterKey, params.clusterKey ?? "");
  query.set(WRAPPED_OG_PARAMS.clusterCount, String(params.clusterCount));
  query.set(WRAPPED_OG_PARAMS.token, sig);
  const path = `${WRAPPED_OG_PATH}?${query.toString()}`;
  return options.absolute === false ? path : `${SITE_URL}${path}`;
}

/** Reverse of buildWrappedOgUrl, for the OG route handler. */
export function parseWrappedOgParams(searchParams: URLSearchParams): {
  params: WrappedCardParams;
  format: WrappedCardFormat;
  sig: string;
} {
  return {
    format: normalizeFormat(searchParams.get(WRAPPED_OG_PARAMS.format)),
    sig: searchParams.get(WRAPPED_OG_PARAMS.token) ?? "",
    params: {
      scopeLabel: searchParams.get(WRAPPED_OG_PARAMS.scopeLabel) ?? "",
      newPeople: toInt(searchParams.get(WRAPPED_OG_PARAMS.newPeople)),
      totalNetwork: toInt(searchParams.get(WRAPPED_OG_PARAMS.totalNetwork)),
      eventsAttended: toInt(searchParams.get(WRAPPED_OG_PARAMS.eventsAttended)),
      overdueFollowUps: toInt(searchParams.get(WRAPPED_OG_PARAMS.overdueFollowUps)),
      clusterKey: searchParams.get(WRAPPED_OG_PARAMS.clusterKey) || null,
      clusterCount: toInt(searchParams.get(WRAPPED_OG_PARAMS.clusterCount)),
    },
  };
}

/** Extract the HMAC segment from a share-page URL (…/wrapped/<body>.<sig>).
 *  Lets the browser rebuild per-format image URLs with the server's signature
 *  without ever needing the signing secret. */
export function shareUrlSig(shareUrl: string): string {
  const token = shareUrl.split("/").pop() ?? "";
  return token.split(".")[1] ?? "";
}
