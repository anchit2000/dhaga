import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";

import { CaptureError, captureContact } from "@/lib/api";
import { getScanLocation } from "@/lib/geolocation";
import { clearPendingCapture, loadPendingCapture, savePendingCapture } from "@/lib/pending-capture";
import { isConfigured, loadSettings } from "@/lib/settings";

import { useEventNamePrompt } from "./use-event-name";
import { usePhotoCapture } from "./use-photo-capture";

import type { CaptureRequest } from "@dhaga/core/src/api/capture";
import type { MobileSettings, ScanOutcome, ScanPath, ScanPayload } from "@/types";

export type CaptureMode = "camera" | "text";

/**
 * All state and side effects behind the capture screen — settings, the
 * camera/text/crop mode switch, submission to /api/capture (with a persisted
 * retry buffer for failed sends), and the one-time event-name prompt. Photo
 * acquisition lives in usePhotoCapture; this hook owns submission so the
 * screen component stays render-only.
 */
export function useCaptureFlow() {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [mode, setMode] = useState<CaptureMode>("camera");
  const [text, setText] = useState("");
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  // A capture whose POST failed, restored from disk so it survives app restarts
  // and stays retryable (see @/lib/pending-capture). Null when nothing is queued.
  const [pendingCapture, setPendingCapture] = useState<ScanPayload | null>(null);
  const { eventToName, setEventToName, confirmEventName, dismissEventPrompt } =
    useEventNamePrompt(settings);
  const photo = usePhotoCapture({ busy, setBusy, setOutcome, finish });

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded) => {
        if (isConfigured(loaded)) setSettings(loaded);
        else router.replace("/setup");
      });
      void loadPendingCapture().then(setPendingCapture);
    }, []),
  );

  /** New capture: resolve the (permission-gated) scan location, then POST. */
  async function finish(request: CaptureRequest, path: ScanPath): Promise<void> {
    if (!settings) return;
    setBusy(true);
    const location = await getScanLocation();
    await runCapture(settings, { ...request, ...location }, path, false);
    setBusy(false);
  }

  /** Re-POST the buffered capture that previously failed (e.g. while offline). */
  async function retryPending(): Promise<void> {
    if (!settings || busy || !pendingCapture) return;
    setBusy(true);
    await runCapture(settings, pendingCapture.request, pendingCapture.path, true);
    setBusy(false);
  }

  /**
   * POST an already-built body. On failure the body is persisted so it can be
   * retried instead of forcing a re-scan. `isRetry` only clears the buffer on
   * success: a new capture succeeding must NOT drop a still-unsent earlier one.
   */
  async function runCapture(
    activeSettings: MobileSettings,
    body: CaptureRequest,
    path: ScanPath,
    isRetry: boolean,
  ): Promise<void> {
    setOutcome(null);
    const startedAt = Date.now();
    try {
      const saved = await captureContact(activeSettings, body);
      const event = "event" in saved ? saved.event : null;
      setOutcome({
        kind: "saved",
        name: saved.name,
        via: "via" in saved ? saved.via : "ai",
        path,
        seconds: (Date.now() - startedAt) / 1000,
        notice: saved.notice,
        event,
      });
      if (event?.isNew) setEventToName(event.id);
      setText("");
      setVoiceHint(null);
      if (isRetry) {
        clearPendingCapture();
        setPendingCapture(null);
      }
    } catch (error) {
      const message =
        error instanceof CaptureError || error instanceof Error ? error.message : "Something went wrong. Try again.";
      setOutcome({ kind: "error", message });
      const pending: ScanPayload = { request: body, path };
      savePendingCapture(pending);
      setPendingCapture(pending);
    }
  }

  function submitText(): void {
    const raw = text.trim();
    if (!raw || busy) return;
    void finish({ raw }, "typed");
  }

  return {
    cameraRef: photo.cameraRef,
    settings,
    mode,
    setMode,
    text,
    setText,
    voiceHint,
    setVoiceHint,
    busy,
    outcome,
    pendingPhoto: photo.pendingPhoto,
    setPendingPhoto: photo.setPendingPhoto,
    pendingCapture,
    retryPending,
    eventToName,
    confirmEventName,
    dismissEventPrompt,
    shootCamera: photo.shootCamera,
    pickFromLibrary: photo.pickFromLibrary,
    applyCroppedPhoto: photo.applyCroppedPhoto,
    submitText,
  };
}
