import { useState } from "react";
import { Linking } from "react-native";

import type { MobileSettings } from "@/types";

/**
 * LinkedIn QR capture (docs/ideas.md; checklist.md's "LinkedIn QR format
 * support", v1.4). Mobile has no per-field "add contact" form of its own —
 * every existing capture path here auto-saves via /api/capture — so unlike
 * web, this can't literally "prefill the manual-add form": the closest
 * honest equivalent is handing off to the web app's existing Add person
 * page, prefilled, in the user's browser. Deliberately does not save
 * anything itself (no scraping, no slug-based name guessing — see
 * CLAUDE.md's "don't fabricate" stance and BRD §6.7).
 */
export function useLinkedInQrCapture(settings: MobileSettings | null) {
  const [linkedInQrUrl, setLinkedInQrUrl] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  /** Ignores repeat frames of the same code while the prompt is already up. */
  function handleLinkedInQrDetected(url: string): void {
    setLinkedInQrUrl((current) => current ?? url);
  }

  function dismissLinkedInPrompt(): void {
    setLinkedInQrUrl(null);
    setOpenError(null);
  }

  async function openLinkedInAddForm(): Promise<void> {
    if (!settings || !linkedInQrUrl) return;
    const target = `${settings.baseUrl}/app/people/new?linkedin=${encodeURIComponent(linkedInQrUrl)}`;
    try {
      await Linking.openURL(target);
      setLinkedInQrUrl(null);
      setOpenError(null);
    } catch {
      setOpenError("Couldn't open the browser. Check the connection and try again.");
    }
  }

  return { linkedInQrUrl, openError, handleLinkedInQrDetected, dismissLinkedInPrompt, openLinkedInAddForm };
}
