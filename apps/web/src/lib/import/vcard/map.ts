/**
 * Map a parsed vCard (its VProp list) into a rich ContactProfile plus a
 * human receipt. Follows the shared spec's step-6 field mapping exactly.
 */
import { emptyContactProfile } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";
import type { VProp } from "./tokenize";
import { resolveLabel, resolvePhoneLabel } from "./labels";
import type { ImportCandidate } from "../types";

function byName(props: VProp[], name: string): VProp[] {
  return props.filter((p) => p.name === name);
}
function firstValue(props: VProp[], name: string): string {
  return byName(props, name)[0]?.value.trim() ?? "";
}
function components(value: string): string[] {
  return value.split(";").map((s) => s.trim());
}

/** FN, else assembled from N (`Family;Given;Additional;Prefix;Suffix`). */
function deriveName(props: VProp[]): string {
  const fn = firstValue(props, "FN");
  if (fn) return fn;
  const n = byName(props, "N")[0];
  if (!n) return "";
  const [family, given, additional, prefix, suffix] = components(n.value);
  return [prefix, given, additional, family, suffix].filter(Boolean).join(" ");
}

function mapPositions(props: VProp[], profile: ContactProfile): void {
  const orgParts = byName(props, "ORG")[0] ? components(byName(props, "ORG")[0].value) : [];
  const title = firstValue(props, "TITLE") || firstValue(props, "ROLE");
  const company = orgParts[0] ?? "";
  if (!title && !company) return;
  profile.positions.push({
    title: title || null,
    company: company || null,
    department: orgParts[1] || null,
    current: true,
    startedAt: null,
    endedAt: null,
    note: null,
  });
}

function mapAddresses(props: VProp[], profile: ContactProfile): void {
  for (const p of byName(props, "ADR")) {
    const [pobox, ext, street, city, region, postalCode, country] = components(p.value);
    const parts = { city: city || null, region: region || null, postalCode: postalCode || null, country: country || null };
    const streetJoined = [pobox, ext, street].filter(Boolean).join(" ") || null;
    if (!streetJoined && !parts.city && !parts.region && !parts.postalCode && !parts.country) continue;
    profile.addresses.push({ label: resolveLabel(p, props), street: streetJoined, ...parts, note: null });
  }
  const first = profile.addresses[0];
  profile.location = first ? first.city ?? first.country : null;
}

function mapDates(props: VProp[], profile: ContactProfile): void {
  const bday = firstValue(props, "BDAY");
  if (bday && bday !== "--") profile.importantDates.push({ label: "Birthday", value: bday, note: null });
  const anniversary = firstValue(props, "ANNIVERSARY");
  if (anniversary && anniversary !== "--") profile.importantDates.push({ label: "Anniversary", value: anniversary, note: null });
  for (const p of byName(props, "X-ABDATE")) {
    if (p.value.trim()) profile.importantDates.push({ label: resolveLabel(p, props) ?? "Date", value: p.value.trim(), note: null });
  }
}

function mapCustomFields(props: VProp[], profile: ContactProfile): void {
  const categories = firstValue(props, "CATEGORIES");
  if (categories) profile.customFields.push({ label: "Categories", value: categories });
  for (const p of byName(props, "IMPP")) {
    if (p.value.trim()) profile.customFields.push({ label: resolveLabel(p, props) ?? "IM", value: p.value.trim() });
  }
  for (const p of byName(props, "X-ABRELATEDNAMES")) {
    if (p.value.trim()) profile.customFields.push({ label: resolveLabel(p, props) ?? "Related", value: p.value.trim() });
  }
}

/** Build one review candidate from a card's props, or null if it has no name. */
export function cardToCandidate(props: VProp[]): ImportCandidate | null {
  const name = deriveName(props);
  if (!name) return null;
  const profile = emptyContactProfile();
  profile.name = name;
  profile.nickname = firstValue(props, "NICKNAME") || null;
  mapPositions(props, profile);
  for (const p of byName(props, "EMAIL")) {
    if (p.value.trim()) profile.emails.push({ value: p.value.trim(), label: resolveLabel(p, props), note: null });
  }
  for (const p of byName(props, "TEL")) {
    if (p.value.trim()) profile.phones.push({ value: p.value.trim(), label: resolvePhoneLabel(p, props), note: null });
  }
  for (const p of props) {
    if ((p.name === "URL" || p.name === "X-SOCIALPROFILE") && p.value.trim()) {
      profile.links.push({ value: p.value.trim(), label: resolveLabel(p, props), note: null });
    }
  }
  mapAddresses(props, profile);
  mapDates(props, profile);
  mapCustomFields(props, profile);
  const note = firstValue(props, "NOTE");
  const receipt = `Imported from vCard (.vcf)${note ? `\nNote: ${note}` : ""}`.slice(0, 2000);
  return { contact: profile, receipt };
}
