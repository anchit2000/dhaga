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
import type { ContactSyncProviderId } from "./sync";

export type ExportFormat = "csv" | "vcard" | "json";

/**
 * Which contacts a contact export contains.
 *
 * - "all" (the default when `scope` is absent) is the portability guarantee:
 *   every contact, whatever its provenance. Never narrow this — a user must be
 *   able to leave with all of their data.
 * - "authored" is the ADDRESS-BOOK SEED scope: only contacts the user created
 *   in Dhaga, i.e. exactly what the sync path is willing to write outward
 *   (apps/web lib/repo/sync/authored.ts). It exists because the recommended
 *   bulk path — export a .vcf, import it into the phone in one go — hands the
 *   file to an external address book, and AI-inferred stubs and re-imported
 *   lists must never land there.
 */
export type ExportScope = "all" | "authored";

/**
 * Query parameters of a contact export (`csv` / `vcard`).
 *
 * `provider` drops contacts already linked on that provider, so a user who has
 * already synced part of their graph can seed only the remainder instead of
 * importing duplicates of everything they synced. Absent = no link filtering.
 * Only meaningful alongside `scope=authored`: a filtered "all" export would be
 * neither the portability dump nor a safe seed.
 */
export interface ContactExportQuery {
  scope: ExportScope;
  provider: ContactSyncProviderId | null;
}
