import { describe, expect, it } from "vitest";
import { parseCursorDto, toCursorDto } from "./cursor";
import type { CaptureLogCursorDto } from "@/types/capture-log";

/**
 * WHY this matters: the cursor is the ONLY thing that makes "Load more"
 * advance. A `Date` cannot cross the server-action boundary, so it is
 * re-created from text on every page — and the two ways that can go wrong are
 * both silent. An Invalid Date reaches Postgres as a malformed comparison, and
 * a cursor quietly treated as absent restarts the log at page 1, so the button
 * re-appends the rows already on screen and page 3 is unreachable forever.
 */
describe("capture-log cursor", () => {
  it("round-trips the keyset position without drift", () => {
    const cursor = { createdAt: new Date("2026-08-06T10:11:12.345Z"), id: "batch-9" };
    const dto = toCursorDto(cursor);
    expect(dto).toEqual({ createdAt: "2026-08-06T10:11:12.345Z", id: "batch-9" });
    expect(parseCursorDto(dto!)).toEqual(cursor);
  });

  // Sub-second precision is load-bearing: the keyset compares created_at first
  // and only falls back to the id on an exact tie, so a cursor rounded to the
  // second would skip every batch opened later in that same second.
  it("preserves milliseconds", () => {
    const dto = toCursorDto({ createdAt: new Date(1_770_000_000_123), id: "b" });
    expect(parseCursorDto(dto!).createdAt.getTime()).toBe(1_770_000_000_123);
  });

  it("encodes 'no next page' as null rather than a sentinel cursor", () => {
    expect(toCursorDto(null)).toBeNull();
  });

  // Fail loud (Rule 12): a cursor is only ever minted by toCursorDto, so an
  // unparseable one is tampering or a bug. Throwing surfaces it as a failed
  // page the UI reports; falling back to "no cursor" would look like success
  // while looping the first page forever.
  const malformed: CaptureLogCursorDto[] = [
    { createdAt: "not a date", id: "b" },
    { createdAt: "", id: "b" },
    { createdAt: "2026-08-06T10:11:12.345Z", id: "" },
    { createdAt: "2026-08-06T10:11:12.345Z", id: "   " },
  ];
  it.each(malformed)(
    "throws on the malformed cursor %p instead of restarting at page 1",
    (dto: CaptureLogCursorDto) => {
      expect(() => parseCursorDto(dto)).toThrow(/Invalid capture-log cursor/);
    },
  );
});
