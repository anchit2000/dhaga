import { StyleSheet, View } from "react-native";

import { CameraCaptureView } from "@/components/camera-capture-view";
import { CropReviewView } from "@/components/crop-review";
import { TextCaptureView } from "@/components/text-capture-view";
import { ResultBanner } from "@/components/result-banner";
import { BottomDock } from "@/components/bottom-dock";
import { COLORS } from "@/utils/constants";

import { buildDockActions } from "./dock-actions";
import { useCaptureFlow } from "./use-capture-flow";

/** Card-scan capture screen: camera/text mode switch, a crop review step
 * between "photo captured" and "photo sent for OCR", and the result banner. */
export default function CaptureScreen() {
  const {
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
    shootCamera,
    pickFromLibrary,
    applyCroppedPhoto,
    submitText,
  } = useCaptureFlow();

  if (!settings) return <View style={styles.screen} />;

  const dockActions = buildDockActions({
    mode,
    onVoice: () => {
      setMode("text");
      setVoiceHint("On-device voice dictation is coming soon — type for now.");
    },
    onCameraOrShutter: () => (mode === "camera" ? void shootCamera() : setMode("camera")),
    onFile: () => void pickFromLibrary(),
  });

  return (
    <View style={styles.screen}>
      {pendingPhoto ? (
        <CropReviewView
          photoUri={pendingPhoto.uri}
          photoWidth={pendingPhoto.width}
          photoHeight={pendingPhoto.height}
          onCancel={() => setPendingPhoto(null)}
          onConfirm={(uri) => void applyCroppedPhoto(uri)}
        />
      ) : (
        <>
          {mode === "camera" ? (
            <CameraCaptureView ref={cameraRef} />
          ) : (
            <TextCaptureView value={text} onChangeText={setText} onSubmit={submitText} busy={busy} hint={voiceHint} />
          )}
          <View style={styles.overlay}>
            {outcome ? <ResultBanner outcome={outcome} /> : null}
            <BottomDock actions={dockActions} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, gap: 16 },
});
