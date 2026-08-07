import type { CaptureLogCursor } from "@/lib/repo/messaging";
import type { CaptureLogCursorDto } from "@/types/capture-log";

/**
 * The keyset cursor's trip across the server-action boundary and back.
 *
 * A `Date` does not survive that boundary, so the cursor travels as ISO text
 * and is rebuilt here. Rebuilding is where it can go wrong: `new Date("junk")`
 * yields an Invalid Date that Postgres rejects mid-query, and — worse — a
 * cursor silently treated as absent would restart the log at page 1, so
 * "Load more" would append the rows already on screen, forever, and the user
 * would never reach page 3. Both failures are loud here instead (Rule 12).
 */

/** Encode a cursor for the client. Null means "there is no next page". */
export function toCursorDto(cursor: CaptureLogCursor | null): CaptureLogCursorDto | null {
  if (!cursor) return null;
  return { createdAt: cursor.createdAt.toISOString(), id: cursor.id };
}

/**
 * Rebuild a cursor the client echoed back. Throws rather than falling back to
 * "no cursor": this value is only ever minted by `toCursorDto`, so anything
 * unparseable is tampering or a bug, and the honest response is a failed page
 * the UI can report — not a silently duplicated one it cannot.
 */
export function parseCursorDto(dto: CaptureLogCursorDto): CaptureLogCursor {
  const id = typeof dto?.id === "string" ? dto.id.trim() : "";
  const raw = typeof dto?.createdAt === "string" ? dto.createdAt : "";
  const createdAt = new Date(raw);
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new Error("Invalid capture-log cursor");
  }
  return { createdAt, id };
}
