import { useMemo, useRef, useState } from "react";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, CROP_INSET_X_RATIO, CROP_INSET_Y_RATIO, CROP_JPEG_COMPRESS } from "@/utils/constants";

import { CropOverlay, type CropOverlayHandle } from "./crop-overlay";
import { clamp, computeDisplayBox, defaultCropRect, type Size } from "./geometry";

import type { LayoutChangeEvent } from "react-native";

export interface CropReviewViewProps {
  photoUri: string;
  /** Native pixel size of the photo, from the camera/picker result. */
  photoWidth: number;
  photoHeight: number;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
}

/**
 * Review step between "photo captured" and "photo sent for OCR" (docs/ideas.md
 * #2): shows the full photo with a draggable/resizable crop rectangle so the
 * user can cut out desk/background before it's parsed. Confirming crops the
 * image with expo-image-manipulator and hands the new uri to `onConfirm`,
 * which continues into the same pipeline an uncropped photo used to.
 */
export function CropReviewView({ photoUri, photoWidth, photoHeight, onConfirm, onCancel }: CropReviewViewProps) {
  const overlayRef = useRef<CropOverlayHandle>(null);
  const [containerSize, setContainerSize] = useState<Size | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayBox = useMemo(() => {
    if (!containerSize) return null;
    return computeDisplayBox({ width: photoWidth, height: photoHeight }, containerSize);
  }, [containerSize, photoWidth, photoHeight]);

  function handleLayout(event: LayoutChangeEvent): void {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }

  async function handleConfirm(): Promise<void> {
    if (!displayBox) return;
    const rect = overlayRef.current?.getRect();
    if (!rect) return;
    setBusy(true);
    setError(null);
    try {
      const pixelScale = photoWidth / displayBox.width;
      const originX = clamp(Math.round(rect.x * pixelScale), 0, photoWidth - 1);
      const originY = clamp(Math.round(rect.y * pixelScale), 0, photoHeight - 1);
      const width = clamp(Math.round(rect.width * pixelScale), 1, photoWidth - originX);
      const height = clamp(Math.round(rect.height * pixelScale), 1, photoHeight - originY);

      const rendered = await ImageManipulator.manipulate(photoUri).crop({ originX, originY, width, height }).renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: CROP_JPEG_COMPRESS });
      onConfirm(saved.uri);
    } catch {
      setError("Couldn't crop that photo. Try again or retake it.");
      setBusy(false);
    }
  }

  return (
    <GestureHandlerRootView style={styles.screen}>
      <View style={styles.imageArea} onLayout={handleLayout}>
        {displayBox ? (
          <>
            <Image
              source={{ uri: photoUri }}
              style={[styles.image, { left: displayBox.x, top: displayBox.y, width: displayBox.width, height: displayBox.height }]}
            />
            <View
              style={[styles.overlayLayer, { left: displayBox.x, top: displayBox.y, width: displayBox.width, height: displayBox.height }]}
            >
              <CropOverlay
                ref={overlayRef}
                bounds={{ width: displayBox.width, height: displayBox.height }}
                defaultRect={defaultCropRect(displayBox, CROP_INSET_X_RATIO, CROP_INSET_Y_RATIO)}
              />
            </View>
          </>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.hint}>Drag the corners to fit the card</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.retakeButton} onPress={onCancel} disabled={busy}>
            <Text style={styles.retakeLabel}>Retake</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, (busy || !displayBox) && styles.confirmButtonDisabled]}
            onPress={() => void handleConfirm()}
            disabled={busy || !displayBox}
          >
            {busy ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.confirmLabel}>Use photo</Text>}
          </Pressable>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  imageArea: { flex: 1, position: "relative" },
  image: { position: "absolute" },
  overlayLayer: { position: "absolute" },
  footer: { padding: 20, gap: 12 },
  hint: { color: COLORS.fog, fontSize: 13, textAlign: "center" },
  error: { color: COLORS.amber, fontSize: 13, textAlign: "center" },
  actions: { flexDirection: "row", gap: 12 },
  retakeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.seam,
    alignItems: "center",
    justifyContent: "center",
  },
  retakeLabel: { color: COLORS.paper, fontSize: 16, fontWeight: "600" },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
});
