import { BIRTHDAY_LABEL } from "@/utils/constants/sync";

import type { DeviceDate, LegacyDate } from "./types";

/**
 * Date conversion between Dhaga's `ImportantDate.value` (ISO-ish text) and the
 * two device date conventions. Isolated because the month bases differ — the
 * modern class API counts 1–12, the legacy API counts 0–11 — and a mistake here
 * silently moves every birthday in the user's address book by a month.
 */

/** `{ year: 1990, month: 3, day: 14 }` → "1990-03-14"; year-less → "03-14". */
export function deviceDateToValue(date: DeviceDate): string {
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  return date.year ? `${date.year}-${mm}-${dd}` : `${mm}-${dd}`;
}

/**
 * The inverse, for writes. Returns null for anything that is not a calendar
 * date — Dhaga stores verbatim dates like "spring 2019" because notes and
 * imports carry them, and an address book has nowhere to put those. Callers
 * drop what they cannot write rather than guessing a day.
 */
export function valueToDeviceDate(value: string): DeviceDate | null {
  const trimmed = value.trim();
  const withYear = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (withYear) {
    return toDate(Number(withYear[2]), Number(withYear[3]), Number(withYear[1]));
  }
  const noYear = /^(\d{2})-(\d{2})$/.exec(trimmed);
  if (noYear) return toDate(Number(noYear[1]), Number(noYear[2]));
  return null;
}

function toDate(month: number, day: number, year?: number): DeviceDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return year === undefined ? { month, day } : { year, month, day };
}

/** Modern (month 1–12) → legacy (month 0–11), for `addContactAsync`. */
export function toLegacyDate(date: DeviceDate, label?: string): LegacyDate {
  const legacy: LegacyDate = { day: date.day, month: date.month - 1 };
  if (date.year !== undefined) legacy.year = date.year;
  if (label !== undefined) legacy.label = label;
  return legacy;
}

/** Whether an ImportantDate label means the contact's birthday. */
export function isBirthdayLabel(label: string): boolean {
  return label.trim().toLowerCase() === BIRTHDAY_LABEL.toLowerCase();
}
