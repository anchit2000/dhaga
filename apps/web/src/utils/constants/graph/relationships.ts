import { EVENT_COLORS } from "../events";

/** Node kinds an edge endpoint may reference ('person' is legacy, normalized to 'contact' by DDL). */
export const RELATIONSHIP_ENDPOINT_KINDS = ["contact", "company", "event", "entity"] as const;
/** Short human labels for endpoint kinds (target-picker badges, kind chips). */
export const RELATIONSHIP_KIND_LABELS: Record<
  (typeof RELATIONSHIP_ENDPOINT_KINDS)[number],
  string
> = { contact: "Person", company: "Company", event: "Event", entity: "Entity" };
/** snake_case predicate/type slugs, e.g. "father_of" — required for stored predicates. */
export const PREDICATE_SLUG_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
/** Node-type colors are plain hex (#rgb or #rrggbb). */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** Node-type swatch choices — reuses the event palette. The picked value is
 *  stored as RAW HEX on the node type (unlike groups, which store a token), so
 *  a swatch hex can never be re-tuned without orphaning saved node-type
 *  colours; these are dark-tuned and several fall under 3:1 on the light
 *  canvas. See the note on EVENT_COLORS. */
export const NODE_TYPE_COLOR_SWATCHES: readonly string[] = EVENT_COLORS.map(
  (color) => color.hex,
);
