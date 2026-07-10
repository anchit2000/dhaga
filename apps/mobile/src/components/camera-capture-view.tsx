import { forwardRef, useImperativeHandle, useRef } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { matchLinkedInProfileUrl } from "@dhaga/core/src/capture/linkedin-qr";
import { CAPTURE_QUALITY, COLORS } from "@/utils/constants";

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

export interface CameraCaptureHandle {
  /** Takes a photo and resolves its uri + pixel size; the dock's shutter button drives this. */
  capture: () => Promise<CapturedPhoto>;
}

interface CameraCaptureViewProps {
  /** Fired when the live preview reads a QR code encoding a LinkedIn profile
   *  URL (docs/ideas.md's "LinkedIn QR format support") — this view only
   *  detects; the capture screen decides what happens next. */
  onLinkedInQrDetected: (url: string) => void;
}

/** Live camera preview; capture is triggered externally (from BottomDock) via the exposed ref. */
export const CameraCaptureView = forwardRef<CameraCaptureHandle, CameraCaptureViewProps>(
  function CameraCaptureView({ onLinkedInQrDetected }, ref) {
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    useImperativeHandle(ref, () => ({
      capture: async () => {
        const photo = await cameraRef.current?.takePictureAsync({ quality: CAPTURE_QUALITY });
        if (!photo?.uri) throw new Error("The camera didn't return a photo.");
        return { uri: photo.uri, width: photo.width, height: photo.height };
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

    return (
      <CameraView
        ref={cameraRef}
        style={styles.screen}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={(result) => {
          const match = matchLinkedInProfileUrl(result.data);
          if (match) onLinkedInQrDetected(match);
        }}
      />
    );
  },
);

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
