import { forwardRef, useImperativeHandle, useRef } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CAPTURE_QUALITY, COLORS } from "@/utils/constants";

export interface CameraCaptureHandle {
  /** Takes a photo and resolves its file uri; the dock's shutter button drives this. */
  capture: () => Promise<string>;
}

/** Live camera preview; capture is triggered externally (from BottomDock) via the exposed ref. */
export const CameraCaptureView = forwardRef<CameraCaptureHandle>(function CameraCaptureView(_props, ref) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const photo = await cameraRef.current?.takePictureAsync({ quality: CAPTURE_QUALITY });
      if (!photo?.uri) throw new Error("The camera didn't return a photo.");
      return photo.uri;
    },
  }));

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.permissionText}>
          Dhaga scans business cards with the camera. Nothing is captured until you tap Camera.
        </Text>
        <Pressable style={styles.grantButton} onPress={() => void requestPermission()}>
          <Text style={styles.grantLabel}>Allow camera access</Text>
        </Pressable>
      </View>
    );
  }

  return <CameraView ref={cameraRef} style={styles.screen} facing="back" />;
});

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
});
