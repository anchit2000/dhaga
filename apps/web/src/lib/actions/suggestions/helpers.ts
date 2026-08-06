/**
 * Plain (non-"use server") sync helpers shared by the suggestions actions — a
 * "use server" file may only export async actions, so these live here instead.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Parse a numeric form field, falling back to `fallback` only when the value
 * is genuinely absent or non-numeric — NOT for a legitimate 0. `Number(x) ||
 * fallback` would coerce a valid 0 (e.g. a midnight startHour) to the default;
 * an explicit finite check preserves it.
 */
export function numberField(raw: FormDataEntryValue | null, fallback: number): number {
  if (raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
