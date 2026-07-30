/**
 * Compose the body a photo note is SAVED with.
 *
 * This is the whole point of the feature: whatever the photo said has to end up
 * in `notes.body`, because that is what gets embedded, searched, and fed to the
 * extraction pipeline. A photo note whose text lives only in the image would be
 * invisible to every one of those — so the transcription is the body, not an
 * attachment to it.
 *
 * The user's own line comes first when they typed one: it is their framing of
 * why the photo matters ("whiteboard from our Q3 planning"), and the machine
 * transcription is the evidence under it. Either half may be missing; an empty
 * result means there is nothing worth saving as a note and the caller must say
 * so rather than persist a blank note against the contact.
 */
export function composePhotoNoteBody(caption: string, transcribed: string | null): string {
  return [caption.trim(), (transcribed ?? "").trim()].filter(Boolean).join("\n\n");
}
