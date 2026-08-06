import { createPayload, isCreate } from "../writes";

import type { SyncAckRequest, SyncWrite } from "@dhaga/core/src/api/sync";
import type { ContactSyncTarget } from "@dhaga/core/src/sync/types";
import type { SyncWriteFailure } from "../writes";

export interface ApplyWritesResult {
  results: SyncAckRequest["results"];
  failures: SyncWriteFailure[];
  created: number;
  updated: number;
}

/**
 * Applies the server's write list to the device address book.
 *
 * One rejected write must not abandon the rest — and must not vanish — so
 * each write is tried independently and a failure is collected rather than
 * thrown.
 */
export async function applyWrites(
  target: ContactSyncTarget,
  writes: readonly SyncWrite[],
  containerId: string | null,
): Promise<ApplyWritesResult> {
  const results: SyncAckRequest["results"] = [];
  const failures: SyncWriteFailure[] = [];
  let created = 0;
  let updated = 0;
  for (const write of writes) {
    try {
      if (isCreate(write)) {
        const payload = createPayload(write.fields);
        if (!payload) {
          failures.push({ contactId: write.contactId, message: "No name to file it under." });
          continue;
        }
        const ref = await target.create(payload, containerId);
        results.push({ contactId: write.contactId, ...ref });
        created += 1;
      } else if (write.externalId) {
        const ref = await target.patch(write.externalId, write.fields, write.etag);
        results.push({ contactId: write.contactId, ...ref });
        updated += 1;
      }
    } catch (error) {
      // One rejected write must not abandon the rest — and must not vanish.
      failures.push({
        contactId: write.contactId,
        message: error instanceof Error ? error.message : "The device rejected the write.",
      });
    }
  }
  return { results, failures, created, updated };
}
