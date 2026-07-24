/**
 * Request/response contract for POST /api/import — the bulk contact-import
 * endpoint used by the mobile app (device contacts via expo-contacts) and any
 * other client that ships already-mapped contacts. Types only (no runtime
 * code): clients deep-import this module so the Anthropic SDK re-exported by
 * the package barrel never enters their bundles (mirrors ./capture).
 */
import type { ContactProfile } from "../schemas/contact";

/** Where the batch came from — recorded on the import webhook + dedup path. */
export type ImportSource = "device" | "vcard" | "google" | "microsoft";

/** One reviewed contact plus the receipt note kept for its imported fields. */
export interface ImportContactInput {
  contact: ContactProfile;
  /** Becomes the contact's capture_source note. ≤2,000 chars. */
  receipt: string;
}

export interface ImportRequest {
  source: ImportSource;
  /** The user-selected contacts to create (server dedups against the graph). */
  contacts: ImportContactInput[];
}

export interface ImportResponse {
  created: number;
  skipped: number;
}
