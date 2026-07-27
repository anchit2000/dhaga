import { normalizeContactMethods } from "@dhaga/core";
import type { ContactMethod } from "@dhaga/core";

/**
 * Pure union+dedup of the multi-value contact columns for a merge. Each takes
 * the surviving contact's values FIRST, then the folded-in sources', and keeps
 * first-seen order so the survivor's own entries lead. No I/O — unit-testable
 * on its own, and the merge transaction stays a thin orchestration on top.
 */

/** Union labeled contact methods (emails / phones / links), deduped by a
 *  case-insensitive trimmed value. Coerces legacy bare-string rows first, so a
 *  method stored as "A@x.com" collapses with one stored as "a@x.com". */
export function unionMethods(lists: unknown[]): ContactMethod[] {
  const out: ContactMethod[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const method of normalizeContactMethods(list)) {
      const key = method.value.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(method);
    }
  }
  return out;
}

/** Union structured JSON columns (addresses / importantDates / customFields),
 *  deduped by whole-object equality so an identical address isn't listed twice. */
export function unionByValue<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const item of list) {
      const key = JSON.stringify(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** Union tag lists, deduped by exact trimmed string; drops blanks. */
export function unionTags(lists: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const tag of list) {
      const trimmed = tag.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}
