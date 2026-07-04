import { useCallback, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ResultBanner } from "@/components/result-banner";
import { CaptureError, captureContact } from "@/lib/api";
import { buildScanPayload } from "@/lib/ocr";
import { isConfigured, loadSettings } from "@/lib/settings";
import { CAPTURE_QUALITY, COLORS } from "@/utils/constants";

import type { MobileSettings, ScanOutcome } from "@/types";

export default function CaptureScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
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

  const scan = async (): Promise<void> => {
    if (!cameraRef.current || !settings || busy) return;
    setBusy(true);
    setOutcome(null);
    const startedAt = Date.now();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: CAPTURE_QUALITY });
      if (!photo?.uri) throw new Error("The camera didn't return a photo.");
      const payload = await buildScanPayload(photo.uri);
      const saved = await captureContact(settings, payload.request);
      setOutcome({
        kind: "saved",
        name: saved.name,
        via: "via" in saved ? saved.via : "ai",
        path: payload.path,
        seconds: (Date.now() - startedAt) / 1000,
        notice: saved.notice,
      });
    } catch (error) {
      const message =
        error instanceof CaptureError || error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";
      setOutcome({ kind: "error", message });
    } finally {
      setBusy(false);
    }
  };

  if (!settings || !permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.permissionText}>
          Dhaga scans business cards with the camera. Nothing is captured until you press the
          shutter.
        </Text>
        <Pressable style={styles.grantButton} onPress={() => void requestPermission()}>
          <Text style={styles.grantLabel}>Allow camera access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.overlay}>
        {outcome ? <ResultBanner outcome={outcome} /> : null}
        <View style={styles.controls}>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push("/setup")}
            disabled={busy}
          >
            <Text style={styles.settingsLabel}>Settings</Text>
          </Pressable>
          <Pressable
            style={[styles.shutter, busy && styles.shutterBusy]}
            onPress={() => void scan()}
            disabled={busy}
            accessibilityLabel="Scan card"
          >
            {busy ? <ActivityIndicator color={COLORS.ink} /> : <View style={styles.shutterDot} />}
          </Pressable>
          <View style={styles.settingsButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  centered: { alignItems: "center", justifyContent: "center", padding: 24, gap: 20 },
  permissionText: { color: COLORS.fog, fontSize: 16, lineHeight: 24, textAlign: "center" },
  grantButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 44,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  grantLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
  camera: { flex: 1 },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, gap: 16 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingsButton: { width: 88, minHeight: 44, justifyContent: "center" },
  settingsLabel: { color: COLORS.paper, fontSize: 15 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBusy: { opacity: 0.6 },
  shutterDot: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: COLORS.ink },
});
