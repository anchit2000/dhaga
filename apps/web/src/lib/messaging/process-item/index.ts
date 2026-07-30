import type { MessagingSessionItemRow } from "@/lib/db/schema";
import { unreadableItemNotice, type MessagingItemKind } from "@/utils/constants/messaging";
import { ingestText } from "../ingest-text";
import {
  readContactCardPayload,
  readLocationPayload,
  readMediaPayload,
  readTextPayload,
} from "../payloads";
import { addNotice, type WalkState } from "../walk-state";
import { handleContactCard, handleLocation } from "./card";
import { handleAudio, handleImage } from "./media";

/**
 * Process one stored item, mutating the walk state. A payload that fails to
 * narrow (schema drift, a hand-edited row) raises a notice instead of throwing:
 * one bad item must never cost the sender the rest of the batch — but it must
 * never disappear quietly either. Errors that DO escape (a media download, an
 * LLM call) are caught per item by ../process-session.
 */
export async function processSessionItem(state: WalkState, item: MessagingSessionItemRow): Promise<void> {
  switch (item.kind as MessagingItemKind) {
    case "contact_card": {
      const payload = readContactCardPayload(item.payload);
      if (payload) await handleContactCard(state, payload.vcard);
      else addNotice(state, unreadableItemNotice());
      return;
    }
    case "image": {
      const payload = readMediaPayload(item.payload);
      if (payload) await handleImage(state, payload.media, payload.caption);
      else addNotice(state, unreadableItemNotice());
      return;
    }
    case "audio": {
      const payload = readMediaPayload(item.payload);
      if (payload) await handleAudio(state, payload.media);
      else addNotice(state, unreadableItemNotice());
      return;
    }
    case "text": {
      const text = readTextPayload(item.payload);
      if (text != null) await ingestText(state, text, "capture_source", "text");
      else addNotice(state, unreadableItemNotice());
      return;
    }
    case "location": {
      const location = readLocationPayload(item.payload);
      if (location) await handleLocation(state, location);
      else addNotice(state, unreadableItemNotice());
      return;
    }
    // Rows stored before unsupported attachments were refused at the door.
    case "unsupported":
      addNotice(state, unreadableItemNotice());
      return;
  }
}
