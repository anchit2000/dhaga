import { describe, expect, it } from "vitest";
import { composePhotoNoteBody } from "./photo-note-body";

describe("composePhotoNoteBody", () => {
  it("puts the transcription in the body so the note is searchable at all", () => {
    // WHY: notes.body is what gets embedded and what the extraction pipeline
    // reads. If the photo's text stayed in the image, a photo note would be a
    // blank row — invisible to search, facts, and follow-ups.
    expect(composePhotoNoteBody("", "Q3 targets\nAPAC: 40%")).toBe("Q3 targets\nAPAC: 40%");
  });

  it("keeps the user's own words when a photo also transcribed", () => {
    // WHY: the caption is the user's framing of why the photo matters. Dropping
    // it in favour of the machine transcription loses the only human context.
    expect(composePhotoNoteBody("Whiteboard from planning", "Q3 targets")).toBe(
      "Whiteboard from planning\n\nQ3 targets",
    );
  });

  it("keeps the caption when nothing could be transcribed", () => {
    // WHY: an unreadable photo (or a user with no AI budget) must still be able
    // to save the note they typed — the feature degrades, it does not fail.
    expect(composePhotoNoteBody("Met at the booth", null)).toBe("Met at the booth");
  });

  it("is empty when there is nothing to save", () => {
    // WHY: the caller relies on "" to refuse the save. A blank note attached to
    // a contact is worse than an error — it looks like data and holds none.
    expect(composePhotoNoteBody("   ", null)).toBe("");
    expect(composePhotoNoteBody("", "   ")).toBe("");
  });
});
