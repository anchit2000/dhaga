"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { invalidateAppNavigation } from "@/lib/cache/app-navigation";
import { setOnboardingTourSeen, setStoreCardPhotos, setUiTheme } from "@/lib/repo/settings";
import { deleteAllCardImages } from "@/lib/repo/card-images";
import { DEFAULT_UI_THEME, parseUiTheme, type UiTheme } from "@/utils/constants/theme";

export async function setStoreCardPhotosAction(
  formData: FormData,
): Promise<void> {
  const enabled = String(formData.get("enabled")) === "true";
  const r = await mutation("setStoreCardPhotos", async (userId) => {
    await setStoreCardPhotos(enabled);
    invalidateAppNavigation(userId);
  });
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/**
 * Two revalidations, not one: /app/settings redraws the picker, and because the
 * theme is emitted from the /app LAYOUT, `revalidatePath("/app", "layout")` is
 * what makes the new palette take across the whole app shell (that call
 * invalidates the layout, every nested layout and every page beneath it).
 */
function revalidateThemedSurfaces(): void {
  revalidatePath("/app/settings");
  revalidatePath("/app", "layout");
}

/**
 * Persists a palette/font choice. The ids arrive as raw form values, so they go
 * through parseUiTheme rather than being trusted: an unknown id falls back to
 * the default per field instead of writing a value that later renders nothing.
 *
 * The mutation() wrapper is written out here, and again in the reset below,
 * rather than shared through a helper: the action-db-scope guard reads each
 * action body on its own, so a scope hidden behind a helper reads as an
 * unscoped action. Keeping it visible is the point of that tripwire.
 */
export async function setUiThemeAction(formData: FormData): Promise<void> {
  // Routed through the same parser the stored value uses, rather than a second
  // hand-rolled check, so the form and the DB can never disagree about what a
  // valid theme is.
  const submitted = JSON.stringify({
    preset: String(formData.get("preset") ?? ""),
    font: String(formData.get("font") ?? ""),
  });
  const theme: UiTheme = parseUiTheme(submitted);
  const r = await mutation("setUiTheme", async (userId) => {
    await setUiTheme(theme);
    invalidateAppNavigation(userId);
  });
  if (!r.ok) throw new Error(r.error);
  revalidateThemedSurfaces();
}

export async function resetUiThemeAction(): Promise<void> {
  const r = await mutation("resetUiTheme", async (userId) => {
    await setUiTheme(DEFAULT_UI_THEME);
    invalidateAppNavigation(userId);
  });
  if (!r.ok) throw new Error(r.error);
  revalidateThemedSurfaces();
}

/** Hard-deletes every stored card photo; transcription receipts stay. */
export async function purgeCardPhotosAction(): Promise<void> {
  const r = await mutation("purgeCardPhotos", () => deleteAllCardImages());
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/** Records that the first-run walkthrough has run, so it never auto-shows
 *  again. Called (fire-and-forget) from the client when the tour ends. No
 *  revalidatePath: /app is force-dynamic, so the next load re-reads the flag.
 *  Best-effort + idempotent: a transient failure is swallowed (mutation() logs
 *  it PII-safe) rather than surfaced — the next load simply re-reads the flag. */
export async function markOnboardingTourSeenAction(): Promise<void> {
  await mutation("markOnboardingTourSeen", () => setOnboardingTourSeen());
}
