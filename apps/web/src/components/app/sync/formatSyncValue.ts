import { SCALAR_FIELDS } from "@dhaga/core/src/sync/types";
import type { ScalarField, SyncField } from "@dhaga/core";

/**
 * Render one side of a conflict as text the user can actually compare.
 *
 * The stored value is `unknown` by contract — one conflict shape covers all
 * nine syncable fields — so this is where it becomes readable. Deliberately
 * lossy in only one direction: it never invents a value, and an empty side
 * reads as "(empty)" rather than as a blank cell, because "Dhaga had nothing
 * here" is itself the thing being decided.
 */

function partsOf(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (entry === null || typeof entry !== "object") return "";
  const record = entry as Record<string, unknown>;
  // ContactMethod is {value,label}; Address is street/city/…; ImportantDate is
  // {label,value}. Taking every string field in order covers all three without
  // three near-identical formatters.
  const values = Object.entries(record)
    .filter(([key, value]) => key !== "note" && typeof value === "string" && value.trim())
    .map(([, value]) => String(value).trim());
  return values.join(" · ");
}

export function formatSyncValue(field: SyncField, value: unknown): string {
  if (SCALAR_FIELDS.includes(field as ScalarField)) {
    return typeof value === "string" && value.trim() ? value.trim() : "(empty)";
  }
  if (!Array.isArray(value) || value.length === 0) return "(empty)";
  const rendered = value.map(partsOf).filter(Boolean);
  return rendered.length > 0 ? rendered.join(", ") : "(empty)";
}
