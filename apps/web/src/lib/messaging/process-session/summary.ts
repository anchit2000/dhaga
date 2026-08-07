import {
  attachedPersonLine,
  createdPersonLine,
  needsInputLine,
  nothingReadableReply,
  unaccountedLine,
  mediaFailedNotice,
  unreadableItemNotice,
} from "@/utils/constants/messaging";
import type { ApplyResult } from "./apply";
import type { UndecipherableItem } from "./derive";

/**
 * The closing report: one line per person saying plainly what happened to them,
 * then everything the batch could NOT do.
 *
 * The ordering matters. Successes first, because that is what the sender is
 * waiting to hear; the things needing them last, because those are the lines
 * they must act on and the eye lands on the end of a chat message. Nothing is
 * ever summarised away — a batch that half-worked says both halves.
 */
export function buildBatchSummary(
  result: ApplyResult,
  unreadable: readonly UndecipherableItem[],
): string {
  const lines: string[] = [];
  for (const person of result.people) {
    lines.push(
      person.created
        ? createdPersonLine(person.name, person.noteCount)
        : attachedPersonLine(person.name, person.noteCount),
    );
  }
  if (result.unclearCount > 0) lines.push(needsInputLine(result.unclearCount));
  if (result.unaccountedSeqs.length > 0) lines.push(unaccountedLine(result.unaccountedSeqs));

  // Deduped: five unreadable photos say it once, not five times.
  const notices = new Set<string>();
  for (const item of unreadable) {
    const media = item.item.kind === "image" || item.item.kind === "audio";
    notices.add(media ? mediaFailedNotice() : unreadableItemNotice());
  }
  lines.push(...notices);

  // Nothing landed and nothing is pending: say so honestly rather than sending
  // an empty message or a cheerful tick with no subject.
  if (lines.length === 0) return nothingReadableReply();
  return lines.join("\n");
}
