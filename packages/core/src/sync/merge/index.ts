import { entriesEqual } from "../keys";
import {
  MULTI_FIELDS,
  SCALAR_FIELDS,
  type SyncConflict,
  type SyncMergeInput,
  type SyncMergeResult,
  type MultiField,
  type ScalarField,
  type SyncableContact,
  type SyncField,
} from "../types";
import { mergeMultiField } from "./multi";
import { mergeScalarField } from "./scalar";

/**
 * Three-way merge of one contact against its last-synced base — the same shape
 * git uses for text, applied to contact fields.
 *
 * Why not timestamps: neither iOS, Android, People nor Graph exposes per-FIELD
 * modification times, only per-record. A last-write-wins scheme on a whole
 * record therefore cannot tell "the user added a phone number on the phone"
 * from "the user renamed the contact in Dhaga", and would clobber one with the
 * other. Comparing each side against the base tells us which side actually
 * moved, per field, with no clocks involved.
 *
 * A genuine conflict is never silently resolved: the remote value is adopted
 * locally so the edit made on the phone survives, the losing Dhaga value is
 * returned in `conflicts` so nothing is destroyed, and the field is excluded
 * from `changedRemotely` — a contested field is never pushed outward.
 */

/**
 * Are two values for one field the same, by that field's own equality? Exported
 * because callers outside the merge need exactly this comparison and must not
 * re-derive it: the persisted-conflict retention rule (apps/web repo/sync) asks
 * "is the value Dhaga lost still absent?", and a second, subtly different
 * comparison there would either strand a resolved conflict forever or drop an
 * unresolved one.
 */
export function sameSyncFieldValue(field: SyncField, a: unknown, b: unknown): boolean {
  if (SCALAR_FIELDS.includes(field as ScalarField)) return (a ?? null) === (b ?? null);
  const listA = (a ?? []) as unknown[];
  const listB = (b ?? []) as unknown[];
  if (listA.length !== listB.length) return false;
  return listA.every((entry, i) => entriesEqual(entry, listB[i]));
}

export function mergeSyncedContact(input: SyncMergeInput): SyncMergeResult {
  const { base, local, remote } = input;
  const hasBase = base !== null && base !== undefined && Object.keys(base).length > 0;

  const merged = {} as SyncableContact;
  const conflicts: SyncConflict[] = [];

  for (const field of SCALAR_FIELDS) {
    const outcome = mergeScalarField(hasBase, base?.[field], local[field], remote[field]);
    merged[field] = outcome.value as SyncableContact[ScalarField] & string;
    if (outcome.conflict) {
      conflicts.push({ field, kind: "both_edited", local: local[field], remote: remote[field] });
    }
  }

  for (const field of MULTI_FIELDS) {
    const outcome = mergeMultiField(field, hasBase, base?.[field], local[field], remote[field]);
    // Each MultiField is a distinct entry type; the merge is key-driven and
    // type-agnostic, so one assertion here beats five parallel code paths.
    merged[field] = outcome.value as SyncableContact[MultiField] & never[];
    if (outcome.conflict) {
      conflicts.push({
        field,
        kind: "edited_vs_removed",
        local: local[field],
        remote: remote[field],
      });
    }
  }

  const contested = new Set(conflicts.map((c) => c.field));
  const allFields: SyncField[] = [...SCALAR_FIELDS, ...MULTI_FIELDS];

  return {
    merged,
    conflicts,
    changedLocally: allFields.filter((f) => !sameSyncFieldValue(f, merged[f], local[f])),
    changedRemotely: allFields.filter(
      (f) => !contested.has(f) && !sameSyncFieldValue(f, merged[f], remote[f]),
    ),
  };
}

export { mergeMultiField } from "./multi";
export { mergeScalarField } from "./scalar";
