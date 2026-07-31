import { z } from "zod";
import { addressSchema, contactMethodSchema, importantDateSchema } from "@dhaga/core";
import {
  CONTACT_SYNC_PROVIDERS,
  SYNC_MAX_ACK_RESULTS,
  SYNC_MAX_CONTACTS,
  SYNC_MAX_OBSERVED_IDS,
} from "@/utils/constants/sync";

/**
 * Wire validation for the two sync endpoints. The contract itself is types-only
 * (packages/core/src/api/sync.ts) because the mobile client shares it; this is
 * the server-side parse of that same shape, with the per-field ceilings a
 * public, api-key-authenticated endpoint needs. Nothing here may widen the
 * contract — a field the contract does not define is a field the client cannot
 * send.
 */
const ID = z.string().min(1).max(300);
const TEXT = z.string().max(500).nullable();

const syncableContactSchema = z.object({
  name: z.string().trim().min(1).max(500),
  nickname: TEXT,
  title: TEXT,
  company: TEXT,
  emails: z.array(contactMethodSchema).max(50),
  phones: z.array(contactMethodSchema).max(50),
  links: z.array(contactMethodSchema).max(50),
  addresses: z.array(addressSchema).max(20),
  importantDates: z.array(importantDateSchema).max(20),
});

export const syncPushRequestSchema = z.object({
  provider: z.enum(CONTACT_SYNC_PROVIDERS),
  containerId: z.string().max(300).nullable(),
  // No lower bound: a user who empties their address book must still be able to
  // report it. `min(1)` made that one state unsendable, so deleting everything
  // on the phone left every link in Dhaga claiming to still be synced. A batch
  // of nothing is harmless on its own — it reconciles nothing, and only
  // `observedEmpty` below turns it into a deletion the sweep may act on.
  contacts: z
    .array(syncableContactSchema.extend({ externalId: ID, etag: z.string().max(300).nullable() }))
    .max(SYNC_MAX_CONTACTS),
  full: z.boolean(),
  // Ids, not contacts, so this cap is its own — it is what lets a chunked run
  // authorise the deletion sweep in one small request. Optional: a chunk that
  // is not the last one omits it, and omitting it means "sweep nothing".
  observedExternalIds: z.array(ID).max(SYNC_MAX_OBSERVED_IDS).nullable().optional(),
  observedEmpty: z.boolean().optional(),
});

export const syncAckRequestSchema = z.object({
  provider: z.enum(CONTACT_SYNC_PROVIDERS),
  results: z
    .array(
      z.object({
        contactId: ID,
        externalId: ID,
        etag: z.string().max(300).nullable(),
      }),
    )
    .min(1)
    .max(SYNC_MAX_ACK_RESULTS),
});
