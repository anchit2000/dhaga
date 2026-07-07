/**
 * Request contract for GET /api/export/[format] — data export (BRD M8).
 * Types only: deep-import this module directly, same as capture.ts.
 *
 * Success responses are raw files (CSV/vCard/JSON download), not a JSON
 * envelope, and the JSON format is a straight dump of the internal Drizzle
 * row shapes (`@/lib/db/schema` in apps/web) — duplicating those as a
 * second set of types here would violate the "no duplicate code" rule for
 * no real benefit, so only the accepted format is modeled.
 */
export type ExportFormat = "csv" | "vcard" | "json";
