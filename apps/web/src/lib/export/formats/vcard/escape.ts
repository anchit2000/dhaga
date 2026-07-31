import type { ContactMethod } from "@dhaga/core";

/** A vCard TYPE token from a method label ("Work Cell" → WORK-CELL), or "" when
 *  the method carries no label — see vCardMethodLine. */
function vCardType(label: string | null): string {
  return (label ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-");
}

export function vCardEscape(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\n");
}

/**
 * One EMAIL/TEL line, carrying the method's own label as a TYPE token — and
 * NO TYPE parameter at all when the method has no label.
 *
 * A bare `EMAIL:` is valid vCard 3.0, and the alternative is worse than
 * untidy: defaulting an unlabeled number to WORK asserts something about it the
 * user never said. That fabrication used to come straight back through sync as
 * a divergence ("Work" here, nothing there) — 1400 conflict rows on a
 * 700-contact seed, every one of them meaningless. Inventing a label is the
 * same class of thing as pushing an inferred "mentioned" stub outward.
 */
export function vCardMethodLine(property: string, method: ContactMethod): string {
  const type = vCardType(method.label);
  const prefix = type ? `${property};TYPE=${type}` : property;
  return `${prefix}:${vCardEscape(method.value)}`;
}
