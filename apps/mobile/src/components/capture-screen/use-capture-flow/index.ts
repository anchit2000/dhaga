import { useCallback, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";

import { type CameraCaptureHandle, type CapturedPhoto } from "@/components/camera-capture-view";
import { CaptureError, captureContact } from "@/lib/api";
import { getScanLocation } from "@/lib/geolocation";
import { buildScanPayload } from "@/lib/ocr";
import { isConfigured, loadSettings } from "@/lib/settings";

import { useSessionNamePrompt } from "./use-session-name";

import type { CaptureRequest } from "@dhaga/core/src/api/capture";
import type { MobileSettings, ScanOutcome, ScanPath } from "@/types";

export type CaptureMode = "camera" | "text";

/**
 * All state and side effects behind the capture screen — settings, the
 * camera/text/crop mode switch, and the three ways a photo becomes a saved
 * contact (camera, library, or a cropped confirmation of either). Kept out
 * of the screen component so that file stays render-only.
 */
export function useCaptureFlow() {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [mode, setMode] = useState<CaptureMode>("camera");
  const [text, setText] = useState("");
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<CapturedPhoto | null>(null);
  const { sessionToName, setSessionToName, confirmSessionName, dismissSessionPrompt } =
    useSessionNamePrompt(settings);

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded) => {
        if (isConfigured(loaded)) setSettings(loaded);
        else router.replace("/setup");
      });
    }, []),
  );

  async function finish(request: CaptureRequest, path: ScanPath): Promise<void> {
    if (!settings) return;
    setBusy(true);
    setOutcome(null);
    const startedAt = Date.now();
    try {
      const location = await getScanLocation();
      const saved = await captureContact(settings, { ...request, ...location });
      const session = "session" in saved ? saved.session : null;
      setOutcome({
        kind: "saved",
        name: saved.name,
        via: "via" in saved ? saved.via : "ai",
        path,
        seconds: (Date.now() - startedAt) / 1000,
        notice: saved.notice,
        session,
      });
      if (session?.isNew) setSessionToName(session.id);
      setText("");
      setVoiceHint(null);
    } catch (error) {
      const message =
        error instanceof CaptureError || error instanceof Error ? error.message : "Something went wrong. Try again.";
      setOutcome({ kind: "error", message });
    } finally {
      setBusy(false);
    }
  }

  async function shootCamera(): Promise<void> {
    if (busy) return;
    try {
      const photo = await cameraRef.current?.capture();
      if (!photo) return;
      setPendingPhoto(photo);
    } catch (error) {
      setOutcome({ kind: "error", message: error instanceof Error ? error.message : "The camera didn't return a photo." });
    }
  }

  async function pickFromLibrary(): Promise<void> {
    if (busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setOutcome({ kind: "error", message: "Photo library access is needed to pick a card photo." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    // The library doesn't always report dimensions; skip the crop step rather than divide by zero.
    if (asset.width > 0 && asset.height > 0) {
      setPendingPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    } else {
      await applyCroppedPhoto(asset.uri);
    }
  }

  /** Confirms the crop review step: crop→OCR pipeline for whichever photo (camera or library) started it.
   * Holds `busy` for the whole pipeline, not just `finish()` — otherwise the gap between "crop confirmed"
   * and "OCR done" leaves the camera/dock fully interactive, letting a second shutter press or library pick
   * start a concurrent capture (and a second POST /api/capture) before the first one resolves. */
  async function applyCroppedPhoto(uri: string): Promise<void> {
    if (busy) return;
    setPendingPhoto(null);
    setBusy(true);
    try {
      const payload = await buildScanPayload(uri);
      await finish(payload.request, payload.path);
    } catch (error) {
      setOutcome({ kind: "error", message: error instanceof Error ? error.message : "Couldn't process that photo." });
      setBusy(false);
    }
  }

  function submitText(): void {
    const raw = text.trim();
    if (!raw || busy) return;
    void finish({ raw }, "typed");
  }

  return {
    cameraRef,
    settings,
    mode,
    setMode,
    text,
    setText,
    voiceHint,
    setVoiceHint,
    busy,
    outcome,
    pendingPhoto,
    setPendingPhoto,
    sessionToName,
    confirmSessionName,
    dismissSessionPrompt,
    shootCamera,
    pickFromLibrary,
    applyCroppedPhoto,
    submitText,
  };
}
