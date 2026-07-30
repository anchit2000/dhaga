import { describe, expect, it } from "vitest";
import { addToTray, moveInTray, removeFromTray, replaceInTray } from "./photoTray";

const file = (name: string): File => new File(["x"], name, { type: "image/jpeg" });
const names = (files: File[]): string[] => files.map((f) => f.name);

describe("photo tray transitions", () => {
  it("caps additions at max instead of dropping the whole selection", () => {
    // WHY: the server rejects more than MAX_CARD_IMAGES. Truncating client-side
    // keeps the user's first N photos; rejecting the batch would lose all of
    // them to a mis-tap in the OS picker.
    const result = addToTray([file("a")], [file("b"), file("c")], 2);
    expect(names(result)).toEqual(["a", "b"]);
  });

  it("preserves order on reorder, because order is transcription order", () => {
    // WHY: multiple photos are pages of the same thing and are transcribed in
    // tray order — a wrong order produces a scrambled note body.
    const tray = [file("a"), file("b"), file("c")];
    expect(names(moveInTray(tray, 2, -1))).toEqual(["a", "c", "b"]);
  });

  it("refuses to move past either end rather than wrapping", () => {
    // WHY: wrapping would silently reorder the whole tray on a stray tap.
    const tray = [file("a"), file("b")];
    expect(moveInTray(tray, 0, -1)).toBe(tray);
    expect(moveInTray(tray, 1, 1)).toBe(tray);
  });

  it("keeps a cropped photo in its original position", () => {
    // WHY: cropping page 2 must not send it to the end of the tray and change
    // the order the pages are read in.
    const tray = [file("a"), file("b"), file("c")];
    expect(names(replaceInTray(tray, 1, file("b-cropped")))).toEqual([
      "a",
      "b-cropped",
      "c",
    ]);
  });

  it("removes exactly one image", () => {
    expect(names(removeFromTray([file("a"), file("b")], 0))).toEqual(["b"]);
  });
});
