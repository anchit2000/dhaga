import type { ContactMethod, ContactProfile } from "@dhaga/core";

/**
 * Render a parsed vCard as readable text for the batch planner.
 *
 * NOT the importer's `receipt`, which is the fixed provenance label "Imported
 * from vCard (.vcf)" — a note about where the data came from, carrying no name,
 * org or number. Feeding that to the planner was a real bug: the card's person
 * was invisible to it, so a forwarded card for somebody already in the graph
 * could never be matched (guessNames saw only "Imported"/"Card", so the real
 * contact never even entered the candidate pool) and a following message could
 * not be related to the card's person — the exact cross-message attribution the
 * batch planner exists to do.
 *
 * The parsed profile is still what gets WRITTEN (see apply/person.ts), so no
 * labelled field is lost to this text round trip. This is only what the planner
 * READS, and it mirrors packages/core's cardReceiptText for a scanned card:
 * derived in code from the fields, deterministically (CLAUDE.md Rule 5).
 */
function methodLine(method: ContactMethod): string {
  const label = method.label?.trim();
  return label ? `${label} – ${method.value.trim()}` : method.value.trim();
}

export function vcardPlannerText(profile: ContactProfile): string {
  // The current role first, falling back to the most recent one listed: a card
  // for someone between jobs still says who they are.
  const position = profile.positions.find((entry) => entry.current) ?? profile.positions[0];
  const role = [position?.title, position?.company]
    .filter((part) => part?.trim())
    .join(" · ");
  const lines = [
    profile.name.trim(),
    profile.nickname?.trim() ?? "",
    role,
    ...profile.emails.map(methodLine),
    ...profile.phones.map(methodLine),
    ...profile.links.map(methodLine),
    profile.location?.trim() ?? "",
  ];
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
