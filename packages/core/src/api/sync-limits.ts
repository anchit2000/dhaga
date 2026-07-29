/**
 * Wire limits for the contact-sync endpoints. Shared because BOTH halves have
 * to agree on them: the client chunks its push to SYNC_MAX_CONTACTS and the
 * server rejects anything larger. A second copy of the number is exactly how
 * the two drift apart and a client starts posting batches the server 413s.
 *
 * These are runtime values, so they live BESIDE ./sync.ts rather than in it —
 * that module is types-only on purpose (clients deep-import it so the package
 * barrel's Anthropic SDK never reaches their bundles). This module imports
 * nothing, so it is just as safe to deep-import from either side.
 */

/**
 * Max observed contacts accepted in one push. Matches the /api/import cap: one
 * request reconciles the whole batch on ONE scoped DB connection, so the batch
 * size is also how long that connection is held. An address book bigger than
 * this is sent as several sequential chunks, with the deletion sweep authorised
 * by `SyncPushRequest.observedExternalIds` on the last one.
 */
export const SYNC_MAX_CONTACTS = 1000;

/**
 * Max external ids accepted in one push's `observedExternalIds`. Far larger
 * than SYNC_MAX_CONTACTS because an id is a short string, not a contact: the
 * whole point of sweeping by id is that the deletion pass stays one small
 * request however many chunks the contacts themselves needed. Still bounded —
 * it is a public endpoint, and an unbounded array is a memory pledge.
 */
export const SYNC_MAX_OBSERVED_IDS = 25000;
