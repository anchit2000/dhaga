/**
 * Label resolution for vCard methods: Apple item-group `X-ABLabel`
 * (`_$!<Work>!$_` → "Work", custom labels verbatim) and TYPE-token mapping.
 * Pure and deterministic.
 */
import type { VProp } from "./tokenize";

const APPLE_WRAP = /^_\$!<(.+)>!\$_$/;

/** The sibling `X-ABLabel` value for a grouped prop, unwrapped. */
function appleLabel(prop: VProp, props: VProp[]): string | null {
  if (!prop.group) return null;
  const sibling = props.find((p) => p.group === prop.group && p.name === "X-ABLABEL");
  const raw = sibling?.value.trim();
  if (!raw) return null;
  const match = APPLE_WRAP.exec(raw);
  return match ? match[1] : raw;
}

function types(prop: VProp): string[] {
  return (prop.params.TYPE ?? []).map((t) => t.toUpperCase());
}

/** General label (email / url / adr): Apple label, then HOME/WORK/OTHER TYPE. */
export function resolveLabel(prop: VProp, props: VProp[]): string | null {
  const apple = appleLabel(prop, props);
  if (apple) return apple;
  const type = types(prop);
  if (type.includes("HOME")) return "Home";
  if (type.includes("WORK")) return "Work";
  if (type.includes("OTHER")) return "Other";
  return null;
}

/** Phone label: TYPE mapping (CELL→Mobile, …), then Apple label, then null. */
export function resolvePhoneLabel(prop: VProp, props: VProp[]): string | null {
  const type = types(prop);
  const has = (t: string): boolean => type.includes(t);
  if (has("CELL") || has("MOBILE")) return "Mobile";
  if (has("IPHONE")) return "iPhone";
  if (has("FAX") && has("WORK")) return "Work Fax";
  if (has("FAX")) return "Fax";
  if (has("HOME")) return "Home";
  if (has("WORK")) return "Work";
  if (has("MAIN")) return "Main";
  if (has("PAGER")) return "Pager";
  return appleLabel(prop, props);
}
