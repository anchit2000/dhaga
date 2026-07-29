import { entriesEqual, indexByKey } from "../keys";
import type { MultiField } from "../types";

/**
 * Multi-value half of the three-way merge (phones, emails, links, addresses,
 * important dates).
 *
 * These merge ADDITIVELY by entry key rather than by replacement, which is why
 * "I added another number on my phone" is not a conflict — it is a union. A
 * removal is only honoured when the other side left that entry untouched;
 * a removal racing an edit is reported instead, because deleting contact data
 * on a heuristic is unrecoverable.
 */
export function mergeMultiField(
  field: MultiField,
  hasBase: boolean,
  baseList: readonly unknown[] | undefined,
  localList: readonly unknown[],
  remoteList: readonly unknown[],
): { value: unknown[]; conflict: boolean } {
  const base = indexByKey(field, baseList ?? []);
  const local = indexByKey(field, localList);
  const remote = indexByKey(field, remoteList);

  // Local order first, then remote-only additions, so Dhaga's ordering is
  // stable and newly pulled entries land predictably at the end.
  const keys = [...local.keys(), ...[...remote.keys()].filter((k) => !local.has(k))];

  const value: unknown[] = [];
  let conflict = false;

  for (const key of keys) {
    const inBase = hasBase && base.has(key);
    const l = local.get(key);
    const r = remote.get(key);

    if (l !== undefined && r !== undefined) {
      if (entriesEqual(l, r)) {
        value.push(l);
      } else if (!hasBase) {
        value.push(l);
        conflict = true;
      } else if (entriesEqual(r, base.get(key))) {
        value.push(l); // only Dhaga edited this entry
      } else if (entriesEqual(l, base.get(key))) {
        value.push(r); // only the phone edited this entry
      } else {
        value.push(r);
        conflict = true;
      }
      continue;
    }

    if (l !== undefined) {
      // Present locally, absent remotely. If it was in the base the phone
      // removed it — honour that, unless Dhaga edited it in the same window.
      if (inBase && entriesEqual(l, base.get(key))) continue;
      if (inBase) conflict = true;
      value.push(l);
      continue;
    }

    if (r !== undefined) {
      // Absent locally, present remotely: either Dhaga removed it (honour the
      // removal) or the phone added it — the "I added another number" case.
      if (inBase && entriesEqual(r, base.get(key))) continue;
      if (inBase) conflict = true;
      value.push(r);
    }
  }

  return { value, conflict };
}
