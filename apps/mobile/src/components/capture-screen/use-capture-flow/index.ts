import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";

import { CaptureError, captureContact } from "@/lib/api";
import { getScanLocation } from "@/lib/geolocation";
import { dequeuePendingCapture, enqueuePendingCapture, loadPendingQueue } from "@/lib/pending-capture";
import { isConfigured, loadSettings } from "@/lib/settings";

import { useEventNamePrompt } from "./use-event-name";
import { usePhotoCapture } from "./use-photo-capture";

import type { CaptureRequest } from "@dhaga/core/src/api/capture";
import type { MobileSettings, ScanOutcome, ScanPath } from "@/types";

export type CaptureMode = "camera" | "text";

/**
 * All state and side effects behind the capture screen — settings, the
 * camera/text/crop mode switch, submission to /api/capture (with a persisted
 * FIFO retry queue for failed sends), and the one-time event-name prompt.
 * Photo acquisition lives in usePhotoCapture; this hook owns submission so the
 * screen component stays render-only.
 */
export function useCaptureFlow() {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [mode, setMode] = useState<CaptureMode>("camera");
  const [text, setText] = useState("");
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  // How many captures whose POST failed are queued for retry (see
  // @/lib/pending-capture); restored from disk so they survive app restarts.
  const [pendingCount, setPendingCount] = useState(0);
  const { eventToName, setEventToName, confirmEventName, dismissEventPrompt } =
    useEventNamePrompt(settings);
  const photo = usePhotoCapture({ busy, setBusy, setOutcome, finish });

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded) => {
        if (isConfigured(loaded)) setSettings(loaded);
        else router.replace("/setup");
      });
      void loadPendingQueue().then((queue) => setPendingCount(queue.length));
    }, []),
  );

  /** New capture: resolve the (permission-gated) scan location, POST, and
   * append the body to the retry queue if the send fails. */
  async function finish(request: CaptureRequest, path: ScanPath): Promise<void> {
    if (!settings) return;
    setBusy(true);
    const location = await getScanLocation();
    const body: CaptureRequest = { ...request, ...location };
    const ok = await runCapture(settings, body, path);
    if (!ok) setPendingCount((await enqueuePendingCapture({ request: body, path })).length);
    setBusy(false);
  }

  /** Drain the queue in FIFO order: resend each entry, remove it on success,
   * and stop at the first failure (still offline) so order and the rest hold. */
  async function drainPending(): Promise<void> {
    if (!settings || busy) return;
    const queue = await loadPendingQueue();
    if (queue.length === 0) return setPendingCount(0);
    setBusy(true);
    for (const entry of queue) {
      if (!(await runCapture(settings, entry.request, entry.path))) break;
      setPendingCount((await dequeuePendingCapture(entry.id)).length);
    }
    setBusy(false);
  }

  /** POST an already-built body; sets the result banner and returns whether it
   * succeeded. Queue bookkeeping is the caller's (finish enqueues, drain dequeues). */
  async function runCapture(
    activeSettings: MobileSettings,
    body: CaptureRequest,
    path: ScanPath,
  ): Promise<boolean> {
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
      return true;
    } catch (error) {
      const message =
        error instanceof CaptureError || error instanceof Error ? error.message : "Something went wrong. Try again.";
      setOutcome({ kind: "error", message });
      return false;
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
    pendingCount,
    drainPending,
    eventToName,
    confirmEventName,
    dismissEventPrompt,
    shootCamera: photo.shootCamera,
    pickFromLibrary: photo.pickFromLibrary,
    applyCroppedPhoto: photo.applyCroppedPhoto,
    submitText,
  };
}
