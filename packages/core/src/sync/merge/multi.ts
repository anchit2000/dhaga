import { entriesEqual, indexByKey } from "../keys";
import { isBlank } from "./blank";
import type { MultiField } from "../types";

/**
 * Reconcile two versions of the SAME entry (they share a key) on a first link,
 * where there is no base to attribute the difference to.
 *
 * Field by field: a blank on either side yields to the side that has a value,
 * and only two real values that differ are a conflict — see ./blank.ts for why
 * silence must not be adjudicated. On conflict the entry is left exactly as
 * Dhaga holds it and flagged, which is the behaviour this branch always had.
 */
function reconcileFirstLink(local: unknown, remote: unknown): { value: unknown; conflict: boolean } {
  if (!local || !remote || typeof local !== "object" || typeof remote !== "object") {
    return { value: local, conflict: true };
  }
  const l = local as Record<string, unknown>;
  const r = remote as Record<string, unknown>;
  const filled: Record<string, unknown> = { ...l };
  for (const key of new Set([...Object.keys(l), ...Object.keys(r)])) {
    if (l[key] === r[key]) continue;
    if (isBlank(l[key])) {
      // Dhaga said nothing here; take what the address book knows.
      if (!isBlank(r[key])) filled[key] = r[key];
      continue;
    }
    // Both sides carry a real, different value: a genuine competing claim.
    if (!isBlank(r[key])) return { value: local, conflict: true };
    // Otherwise the remote is the silent one — keep Dhaga's value, say nothing.
  }
  return { value: filled, conflict: false };
}

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
        const reconciled = reconcileFirstLink(l, r);
        value.push(reconciled.value);
        if (reconciled.conflict) conflict = true;
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
