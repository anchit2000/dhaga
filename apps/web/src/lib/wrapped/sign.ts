import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/utils/constants/site";
import {
  WRAPPED_CARD_SIZES,
  WRAPPED_DEFAULT_FORMAT,
  WRAPPED_SHARE_PATH,
} from "@/utils/constants/wrapped";
import { statsToCardParams } from "./og-url";
import type { WrappedCardParams } from "./og-url";
import type { WrappedCardFormat, WrappedStats } from "@dhaga/core/src/api/wrapped";

/**
 * Server-only HMAC over the CONTACT-FREE card params, so a public Wrapped card
 * can't be forged with vanity numbers. The signature covers counts, the scope
 * label, and the top-cluster CATEGORY — never a person's name (the name-bearing
 * `reveal` fields are never serialized here). Keyed on BETTER_AUTH_SECRET, the
 * same idiom as lib/calendar/oauth.ts's signed state.
 */

const FIELD_SEP = "\x1f";

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) {
    throw new Error(
      "Set BETTER_AUTH_SECRET — Network Wrapped share cards are HMAC-signed with it.",
    );
  }
  return value;
}

/** Canonical, format-independent serialization the HMAC covers. */
function canonical(params: WrappedCardParams): string {
  return [
    params.scopeLabel,
    params.newPeople,
    params.totalNetwork,
    params.eventsAttended,
    params.overdueFollowUps,
    params.clusterKey ?? "",
    params.clusterCount,
  ].join(FIELD_SEP);
}

export function signWrappedParams(params: WrappedCardParams): string {
  return createHmac("sha256", secret()).update(canonical(params)).digest("base64url");
}

export function verifyWrappedParams(params: WrappedCardParams, sig: string): boolean {
  if (!sig) return false;
  const given = Buffer.from(sig);
  const want = Buffer.from(signWrappedParams(params));
  return given.length === want.length && timingSafeEqual(given, want);
}

interface WrappedTokenBody {
  p: WrappedCardParams;
  f: WrappedCardFormat;
}

/** Self-contained share token: base64url(payload) + "." + HMAC(payload). */
export function encodeWrappedToken(
  params: WrappedCardParams,
  format: WrappedCardFormat,
): string {
  const body: WrappedTokenBody = { p: params, f: format };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${signWrappedParams(params)}`;
}

export function decodeWrappedToken(
  token: string,
): { params: WrappedCardParams; format: WrappedCardFormat } | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  let body: WrappedTokenBody;
  try {
    body = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as WrappedTokenBody;
  } catch {
    return null;
  }
  if (!body?.p || !verifyWrappedParams(body.p, sig)) return null;
  const format = body.f in WRAPPED_CARD_SIZES ? body.f : WRAPPED_DEFAULT_FORMAT;
  return { params: body.p, format };
}

/** Absolute, unfurlable /wrapped/<token> page URL for a scope's stats. */
export function buildWrappedShareUrl(
  stats: WrappedStats,
  format: WrappedCardFormat = WRAPPED_DEFAULT_FORMAT,
): string {
  const token = encodeWrappedToken(statsToCardParams(stats), format);
  return `${SITE_URL}${WRAPPED_SHARE_PATH}/${token}`;
}
