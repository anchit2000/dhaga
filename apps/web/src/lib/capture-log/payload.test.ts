import { describe, expect, it } from "vitest";
import { previewPayload, readOutcomeLink } from "./payload";

/**
 * WHY these matter: `payload` and `outcome` are `unknown` jsonb written by a
 * pipeline that has already changed shape once and can be hand-edited in psql.
 * The capture log is the page a user opens when something looks wrong, so it is
 * the LAST page allowed to break on a row it doesn't recognise — and the last
 * page allowed to quietly misreport one.
 */
describe("previewPayload", () => {
  it("shows what a forwarded note said", () => {
    expect(previewPayload("text", { text: "Met Priya at the summit" })).toEqual({
      state: "text",
      text: "Met Priya at the summit",
    });
  });

  // A photo with no caption is a perfectly ordinary row. Reporting it as
  // corrupt would send a user hunting a bug that isn't there — so recognition
  // keys off `media`, the field that proves the shape, not `caption`.
  it("calls a captionless photo empty, not unreadable", () => {
    expect(previewPayload("image", { media: { id: "m1" } })).toEqual({ state: "empty" });
    expect(previewPayload("image", { media: { id: "m1" }, caption: "her badge" })).toEqual({
      state: "text",
      text: "her badge",
    });
  });

  // Whitespace is not content: rendering " " would put a blank line where the
  // user expects to be told there was nothing.
  it("treats a whitespace-only caption as no caption", () => {
    expect(previewPayload("audio", { media: { id: "a1" }, caption: "   " })).toEqual({
      state: "empty",
    });
  });

  it("names a contact card by its display name", () => {
    expect(previewPayload("contact_card", { vcard: "BEGIN:VCARD", displayName: "Ravi" })).toEqual({
      state: "text",
      text: "Ravi",
    });
  });

  // The log must say the same thing about a pin that the saved note says
  // (locationNoteBody falls back to coordinates the same way), or the two
  // surfaces disagree about the same message.
  it("falls back from a pin's name to its coordinates", () => {
    expect(previewPayload("location", { latitude: 12.9, longitude: 77.6 })).toEqual({
      state: "text",
      text: "12.9, 77.6",
    });
  });

  // The distinction the whole three-state union exists for: "nothing was
  // written" and "we could not read what was stored" lead a user to different
  // actions, so they must never collapse into one blank render.
  const malformed: Array<{ why: string; kind: string; payload: unknown }> = [
    { why: "a payload of the wrong type", kind: "text", payload: "just a string" },
    { why: "a null payload", kind: "text", payload: null },
    { why: "an array payload", kind: "text", payload: ["nope"] },
    { why: "a text row missing its text key", kind: "text", payload: { caption: "wrong" } },
    { why: "an image row missing its media key", kind: "image", payload: { caption: "orphan" } },
    { why: "a card row missing its vcard", kind: "contact_card", payload: { displayName: "R" } },
    { why: "a pin with no name and no coordinates", kind: "location", payload: { accuracy: 5 } },
    { why: "a kind this build has never heard of", kind: "hologram", payload: { text: "hi" } },
  ];
  it.each(malformed)("reports $why as unreadable rather than empty", ({ kind, payload }) => {
    expect(previewPayload(kind, payload)).toEqual({ state: "unreadable" });
  });
});

describe("readOutcomeLink", () => {
  it("keeps the ids the log links to", () => {
    expect(
      readOutcomeLink({ contactId: "c1", contactName: "Priya", noteId: "n1", reason: "no match" }),
    ).toEqual({
      contactId: "c1",
      contactName: "Priya",
      noteId: "n1",
      confirmationId: null,
      reason: "no match",
    });
  });

  // Every field of ItemOutcomeDetail is optional, and older rows stored no
  // detail at all. A verdict is still worth showing without one — losing the
  // whole row because it has no link would hide the very messages (unaccounted,
  // unreadable) this log exists to surface.
  const empties: unknown[] = [null, undefined, "garbage", 42, {}];
  it.each(empties)(
    "degrades a detail of %p to an empty link set instead of throwing",
    (outcome: unknown) => {
      expect(readOutcomeLink(outcome)).toEqual({
        contactId: null,
        contactName: null,
        noteId: null,
        confirmationId: null,
        reason: null,
      });
    },
  );

  // A non-string id would sail into an href and produce a broken link; dropping
  // it renders the verdict with no link, which is honest.
  it("drops an id that is not a string", () => {
    expect(readOutcomeLink({ contactId: 7, confirmationId: "" }).contactId).toBeNull();
    expect(readOutcomeLink({ contactId: 7, confirmationId: "" }).confirmationId).toBeNull();
  });
});
