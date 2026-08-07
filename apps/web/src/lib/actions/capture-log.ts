"use server";

import { requireUserId } from "@/lib/auth/guard";
import { parseCursorDto, toCursorDto, toEntryDto, toItemDto } from "@/lib/capture-log";
import { withUserDb } from "@/lib/db/request-scope";
import { listCaptureLog, listCaptureLogItems } from "@/lib/repo/messaging";
import { CAPTURE_LOG_PAGE_SIZE } from "@/utils/constants/capture-log";
import type { CaptureLogCursorDto, CaptureLogItemDto, CaptureLogPageDto } from "@/types/capture-log";

/**
 * The capture log's two on-demand reads (Settings → Messaging → Capture log).
 * The page server-renders the first page; these serve everything after it.
 *
 * Both are strictly the caller's own data: `withUserDb` scopes the read to
 * `requireUserId()`'s id, exactly as the neighbouring ai-credits action does,
 * and no user id is ever accepted from the client. A session id IS accepted —
 * it has to be, that is what "expand this row" means — but RLS is what makes it
 * safe: a id belonging to someone else simply returns no rows.
 *
 * One `withUserDb` per call, never fanned out: the tenant pool caps at 3.
 *
 * PRIVACY: these responses carry note text and contact names. Nothing here logs
 * a request or a result, and nothing may.
 */

/** One "Load more" page of batches, newest first. Keyset — the cursor is the
 *  position of the last row already shown, not a page number. */
export async function getCaptureLogPageAction(
  cursor: CaptureLogCursorDto | null,
): Promise<CaptureLogPageDto> {
  const userId = await requireUserId();
  const page = await withUserDb(userId, () =>
    listCaptureLog({
      limit: CAPTURE_LOG_PAGE_SIZE,
      cursor: cursor ? parseCursorDto(cursor) : null,
    }),
  );
  return {
    entries: page.entries.map(toEntryDto),
    nextCursor: toCursorDto(page.nextCursor),
  };
}

/**
 * The messages inside ONE batch, in arrival order — fetched when a row is
 * expanded rather than with the page. A page of 20 batches would otherwise cost
 * 21 queries for a list where most rows are never opened.
 */
export async function getCaptureLogItemsAction(
  sessionId: string,
): Promise<CaptureLogItemDto[]> {
  const userId = await requireUserId();
  if (typeof sessionId !== "string" || sessionId.trim() === "") {
    throw new Error("Missing batch id");
  }
  const items = await withUserDb(userId, () => listCaptureLogItems(sessionId));
  return items.map(toItemDto);
}
