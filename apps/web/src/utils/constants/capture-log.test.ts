import { describe, expect, it } from "vitest";
import {
  CAPTURE_LOG_UNFINISHED_LIMIT,
  itemKindLabel,
  sessionStatusLabel,
  unfinishedBatchesLabel,
} from "./capture-log";

/**
 * WHY these matter: every string here describes somebody's data back to them.
 * A stored status or kind can outlive the build that wrote it, and the
 * unfinished count comes off a LIMITed query — so the only two ways to get this
 * wrong are to crash on a value we don't know, or to state a number we never
 * actually counted.
 */
describe("capture-log labels", () => {
  it("names each known status and kind in the sender's words", () => {
    expect(sessionStatusLabel("open")).toBe("Waiting for DONE");
    expect(sessionStatusLabel("done")).toBe("Saved");
    expect(itemKindLabel("image")).toBe("Photo");
    expect(itemKindLabel("contact_card")).toBe("Contact card");
  });

  // A row from an older or newer build must not render as `undefined` or leak
  // the raw column value into the UI.
  it("labels an unrecognised status or kind rather than leaking the raw value", () => {
    expect(sessionStatusLabel("quantum")).toBe("Unknown status");
    expect(itemKindLabel("hologram")).toBe("Message");
  });
});

describe("unfinishedBatchesLabel", () => {
  it("counts exactly while the count is genuinely known", () => {
    expect(unfinishedBatchesLabel(1, CAPTURE_LOG_UNFINISHED_LIMIT)).toBe("1 batch hasn't finished");
    expect(unfinishedBatchesLabel(3, CAPTURE_LOG_UNFINISHED_LIMIT)).toBe(
      "3 batches haven't finished",
    );
  });

  // At the cap the query stopped counting, so an exact number would be a claim
  // about rows nobody looked at.
  it("says 'at least' once the query's own cap is reached", () => {
    expect(unfinishedBatchesLabel(CAPTURE_LOG_UNFINISHED_LIMIT, CAPTURE_LOG_UNFINISHED_LIMIT)).toBe(
      `${CAPTURE_LOG_UNFINISHED_LIMIT}+ batches haven't finished`,
    );
  });
});
