import { useCallback, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { BottomDock, type DockAction } from "@/components/bottom-dock";
import { CameraCaptureView, type CameraCaptureHandle } from "@/components/camera-capture-view";
import { TextCaptureView } from "@/components/text-capture-view";
import { ResultBanner } from "@/components/result-banner";
import { CaptureError, captureContact } from "@/lib/api";
import { buildScanPayload } from "@/lib/ocr";
import { isConfigured, loadSettings } from "@/lib/settings";
import { COLORS } from "@/utils/constants";

import type { CaptureRequest } from "@dhaga/core/src/api/capture";
import type { MobileSettings, ScanOutcome, ScanPath } from "@/types";

type Mode = "camera" | "text";

export default function CaptureScreen() {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [mode, setMode] = useState<Mode>("camera");
  const [text, setText] = useState("");
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

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
      const saved = await captureContact(settings, request);
      setOutcome({
        kind: "saved",
        name: saved.name,
        via: "via" in saved ? saved.via : "ai",
        path,
        seconds: (Date.now() - startedAt) / 1000,
        notice: saved.notice,
      });
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
      const uri = await cameraRef.current?.capture();
      if (!uri) return;
      const payload = await buildScanPayload(uri);
      await finish(payload.request, payload.path);
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
    const uri = result.assets?.[0]?.uri;
    if (result.canceled || !uri) return;
    const payload = await buildScanPayload(uri);
    await finish(payload.request, payload.path);
  }

  function submitText(): void {
    const raw = text.trim();
    if (!raw || busy) return;
    void finish({ raw }, "typed");
  }

  if (!settings) return <View style={styles.screen} />;

  const dockActions: DockAction[] = [
    {
      key: "voice",
      icon: <Feather name="mic" size={20} color={mode === "text" ? COLORS.amber : COLORS.paper} />,
      label: "Voice",
      active: mode === "text",
      onPress: () => {
        setMode("text");
        setVoiceHint("On-device voice dictation is coming soon — type for now.");
      },
    },
    {
      key: "camera",
      icon: <Feather name="camera" size={20} color={mode === "camera" ? COLORS.amber : COLORS.paper} />,
      label: mode === "camera" ? "Shutter" : "Camera",
      active: mode === "camera",
      onPress: () => (mode === "camera" ? void shootCamera() : setMode("camera")),
    },
    {
      key: "file",
      icon: <Feather name="image" size={20} color={COLORS.paper} />,
      label: "File",
      onPress: () => void pickFromLibrary(),
    },
  ];

  return (
    <View style={styles.screen}>
      {mode === "camera" ? (
        <CameraCaptureView ref={cameraRef} />
      ) : (
        <TextCaptureView value={text} onChangeText={setText} onSubmit={submitText} busy={busy} hint={voiceHint} />
      )}
      <View style={styles.overlay}>
        {outcome ? <ResultBanner outcome={outcome} /> : null}
        <BottomDock actions={dockActions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, gap: 16 },
});
