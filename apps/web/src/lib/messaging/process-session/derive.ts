import type { ContactProfile, LLMImage } from "@dhaga/core";
import type { MessagingClient } from "@dhaga/core/src/messaging";
import { hasTranscription, getTranscriptionClient } from "@dhaga/core/src/transcription";
import { AiBudgetError } from "@/lib/ai/metering";
import { vcardToCandidates } from "@/lib/import";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import { locationNoteBody, type MessagingItemKind } from "@/utils/constants/messaging";
import {
  readContactCardPayload,
  readLocationPayload,
  readMediaPayload,
  readTextPayload,
} from "../payloads";
import { deriveImage } from "./derive-image";
import { vcardPlannerText } from "./vcard-text";

/**
 * One message reduced to TEXT so the batch planner can read the whole batch at
 * once. Deriving is deliberately separated from writing: the old walk decided
 * who a message was about at the moment it read it, which is precisely why it
 * could not relate "Create a new contact" to the message before it.
 *
 * `profile` and `image` ride along because some value cannot survive a round
 * trip through text — a vCard's labelled fields (work vs. mobile) and the photo
 * itself. The apply step reattaches them to whatever the plan does with the seq.
 */
export interface DerivedItem {
  item: MessagingSessionItemRow;
  seq: number;
  kind: string;
  text: string;
  /** Structured vCard data — used verbatim rather than re-extracted from text. */
  profile?: ContactProfile;
  /** The photo this text was read off, to keep alongside the note it becomes. */
  image?: LLMImage;
}

/** A message nothing could be read out of. Reported, never dropped. */
export interface UndecipherableItem {
  item: MessagingSessionItemRow;
  /** PII-free: a fixed code, never the content. */
  reason: string;
}

export interface DeriveResult {
  derived: DerivedItem[];
  unreadable: UndecipherableItem[];
}

/**
 * Reduce every item in a batch to text, in arrival order. Sequential, not
 * Promise.all: each media item costs a download plus a vision/transcription
 * call, and fanning those out would run several model calls concurrently for one
 * batch while holding the walk open — the cost the MESSAGING_MAX_OPEN_ITEMS cap
 * exists to bound.
 *
 * Never throws for one bad item: an item that cannot be read becomes an
 * `unreadable` entry so the batch still lands and the sender is still told.
 */
export async function deriveBatch(
  userId: string,
  client: MessagingClient,
  items: readonly MessagingSessionItemRow[],
): Promise<DeriveResult> {
  const derived: DerivedItem[] = [];
  const unreadable: UndecipherableItem[] = [];
  for (const item of items) {
    try {
      const one = await deriveItem(userId, client, item);
      if (one) derived.push(one);
      else unreadable.push({ item, reason: "empty" });
    } catch (error) {
      // AiBudgetError is worth distinguishing: it is not a broken message, and
      // the whole batch is about to fail on it anyway.
      unreadable.push({ item, reason: error instanceof AiBudgetError ? "over_budget" : "failed" });
    }
  }
  return { derived, unreadable };
}

async function deriveItem(
  userId: string,
  client: MessagingClient,
  item: MessagingSessionItemRow,
): Promise<DerivedItem | null> {
  const base = { item, seq: item.seq, kind: item.kind };
  switch (item.kind as MessagingItemKind) {
    case "text": {
      const text = readTextPayload(item.payload);
      return text?.trim() ? { ...base, text } : null;
    }
    case "contact_card": {
      const payload = readContactCardPayload(item.payload);
      const first = payload ? vcardToCandidates(payload.vcard)[0] : undefined;
      if (!first) return null;
      // A RENDERING of the card is what the planner reads — never the importer's
      // `receipt`, which is the fixed label "Imported from vCard (.vcf)" and
      // would leave the card's person invisible to the plan. The parsed profile
      // is what gets WRITTEN, so no labelled field is lost to the round trip.
      const text = vcardPlannerText(first.contact);
      return text ? { ...base, text, profile: first.contact } : null;
    }
    case "image": {
      const payload = readMediaPayload(item.payload);
      if (!payload) return null;
      return deriveImage(userId, client, base, payload.media, payload.caption);
    }
    case "audio": {
      const payload = readMediaPayload(item.payload);
      if (!payload || !hasTranscription()) return null;
      const downloaded = await client.downloadMedia(payload.media);
      const result = await getTranscriptionClient().transcribe({
        data: downloaded.data,
        mimeType: downloaded.mimeType,
      });
      return result.text.trim() ? { ...base, text: result.text } : null;
    }
    case "location": {
      const location = readLocationPayload(item.payload);
      if (!location) return null;
      const label = location.name ?? `${location.latitude}, ${location.longitude}`;
      return { ...base, text: locationNoteBody(label) };
    }
    case "unsupported":
      return null;
  }
}

