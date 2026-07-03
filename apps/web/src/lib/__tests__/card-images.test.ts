import { describe, expect, it } from "vitest";
import { createContact, forgetContact } from "@/lib/repo/contacts";
import { addNote, deleteNote } from "@/lib/repo/notes";
import {
  getCardImage,
  listCardImageRefs,
  saveCardImage,
} from "@/lib/repo/card-images";
import {
  setStoreCardPhotos,
  shouldStoreCardPhotos,
} from "@/lib/repo/settings";

const contactInput = {
  name: "Card Person",
  title: null,
  company: null,
  emails: [],
  phones: [],
  links: [],
  location: null,
};

// A 1×1 PNG — enough to prove round-tripping without a real photo.
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Card photos are the most sensitive stored artifact: storage must be a
 * user choice (default on), and no photo may outlive its receipt note or
 * its contact — same trust story as facts, but hard-deleted.
 */
describe("card photo storage", () => {
  it("stores and retrieves a photo tied to its receipt note", async () => {
    const id = await createContact(contactInput, "quick_add");
    const noteId = await addNote(id, "capture_source", "ACME · Card Person");
    const imageId = await saveCardImage(id, noteId, "image/png", TINY_PNG);

    const image = await getCardImage(imageId);
    expect(image?.dataBase64).toBe(TINY_PNG);
    expect(image?.mediaType).toBe("image/png");
    expect(await listCardImageRefs(id)).toHaveLength(1);
  });

  it("deleting the receipt note hard-deletes the photo", async () => {
    const id = await createContact({ ...contactInput, name: "Note Delete" }, "quick_add");
    const noteId = await addNote(id, "capture_source", "receipt");
    const imageId = await saveCardImage(id, noteId, "image/png", TINY_PNG);

    await deleteNote(noteId);
    expect(await getCardImage(imageId)).toBeNull();
  });

  it("forgetting the person removes their photos", async () => {
    const id = await createContact({ ...contactInput, name: "Forget Me" }, "quick_add");
    const noteId = await addNote(id, "capture_source", "receipt");
    const imageId = await saveCardImage(id, noteId, "image/png", TINY_PNG);

    await forgetContact(id);
    expect(await getCardImage(imageId)).toBeNull();
  });

  it("storage defaults on and the setting round-trips", async () => {
    expect(await shouldStoreCardPhotos()).toBe(true);
    await setStoreCardPhotos(false);
    expect(await shouldStoreCardPhotos()).toBe(false);
    await setStoreCardPhotos(true);
    expect(await shouldStoreCardPhotos()).toBe(true);
  });
});
