import { requestPermissionsAsync } from "expo-contacts";
import { getContactSyncTarget } from "@dhaga/core/src/sync";

import { CaptureError } from "@/lib/api";
import { ackContactSync, pushContactSync } from "@/lib/api-sync";
import { DEVICE_SYNC_PROVIDER } from "@/utils/constants/sync";

import { containerNotice, contactsInContainer, pickWriteContainer } from "../containers";
import { toObserved } from "../writes";
import { syncPlatform } from "../device-target";
import { applyWrites } from "./apply-writes";
import { buildPushChunks, mergePushResponses } from "./chunks";

import type { SyncPushResponse } from "@dhaga/core/src/api/sync";
import type { MobileSettings } from "@/types";
import type { SyncOutcome, SyncPhaseHandler, SyncRunResult } from "./types";

/**
 * One two-way contact sync: permissions → read the address book → push what we
 * saw (in chunks past SYNC_MAX_CONTACTS, ./chunks.ts) → apply the writes the
 * server hands back → acknowledge the ids the platform minted.
 *
 * The ack is not optional. A created record has no id until the OS assigns one,
 * so a run that applies writes and skips the ack leaves the server unable to
 * recognise its own contact next time, and the next sync creates a duplicate.
 * That is why every applied write is acknowledged, including the patches.
 */

export type {
  SyncOutcome,
  SyncPhase,
  SyncPhaseHandler,
  SyncProgress,
  SyncRunResult,
} from "./types";

/**
 * `pushUnlinked` asks the server to also offer Dhaga contacts that have no link
 * here as creates on this phone — the "someone I added in Dhaga should be
 * reachable from my phone" direction. The server narrows that to contacts the
 * user actually authored in Dhaga (never AI-inferred stubs, never rows that
 * arrived from an import or another provider), so what it offers is bounded
 * whoever asks.
 *
 * The parameter defaults OFF, and so does the switch on the sync screen: the
 * user-facing default belongs to the screen that shows the switch, and it
 * answers the same way (see components/contact-sync/use-contact-sync.ts).
 */
export async function runContactSync(
  settings: MobileSettings,
  onPhase: SyncPhaseHandler,
  pushUnlinked = false,
): Promise<SyncOutcome> {
  try {
    onPhase("permission");
    const permission = await requestPermissionsAsync();
    if (!permission.granted) return { kind: "denied", canAskAgain: permission.canAskAgain };
    return { kind: "done", result: await sync(settings, onPhase, pushUnlinked) };
  } catch (error) {
    const message =
      error instanceof CaptureError || error instanceof Error
        ? error.message
        : "Something went wrong. Try again.";
    return { kind: "error", message };
  }
}

async function sync(
  settings: MobileSettings,
  onPhase: SyncPhaseHandler,
  pushUnlinked: boolean,
): Promise<SyncRunResult> {
  const target = getContactSyncTarget(DEVICE_SYNC_PROVIDER);

  onPhase("reading");
  const containers = await target.listContainers();
  const container = pickWriteContainer(containers);
  const containerId = container?.id ?? null;
  // `listChanged` has no modified-since query to offer, so this is always a
  // full snapshot — which is what lets the server read absences as deletions.
  const observed = contactsInContainer(await target.listChanged(null), containerId);

  const chunks = buildPushChunks({
    provider: DEVICE_SYNC_PROVIDER,
    containerId,
    contacts: toObserved(observed),
  });
  const responses: SyncPushResponse[] = [];
  for (const [index, chunk] of chunks.entries()) {
    const last = index === chunks.length - 1;
    onPhase("pushing", chunks.length > 1 ? { chunk: index + 1, total: chunks.length } : undefined);
    // Sequential, never Promise.all: the server reconciles each chunk on ONE
    // connection out of a max-3 tenant pool, and chunk N+1 depends on the links
    // chunk N wrote — its dedup reads them, and its sweep would tombstone them.
    //
    // `pushUnlinked` rides the last chunk alone. It is answered per request
    // against "Dhaga contacts with no link here", so asking on every chunk
    // would offer the same people again and again, and the phone would create a
    // duplicate card for each.
    responses.push(await pushContactSync(settings, chunk, pushUnlinked && last));
  }
  const response = mergePushResponses(responses);

  onPhase("writing");
  const { results, failures, created, updated } = await applyWrites(target, response.writes, containerId);

  if (results.length > 0) {
    onPhase("confirming");
    await ackContactSync(settings, { provider: DEVICE_SYNC_PROVIDER, results });
  }

  return {
    observed: observed.length,
    created,
    updated,
    pulled: response.pulled,
    createdInDhaga: response.created,
    linked: response.linked,
    remaining: response.remaining,
    conflicts: response.conflicts,
    failures,
    container,
    notice: containerNotice(container, syncPlatform()),
  };
}
