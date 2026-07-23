import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CameraCaptureView } from "@/components/camera-capture-view";
import { CropReviewView } from "@/components/crop-review";
import { TextCaptureView } from "@/components/text-capture-view";
import { ResultBanner } from "@/components/result-banner";
import { BottomDock } from "@/components/bottom-dock";
import { EventNamePrompt } from "@/components/event-name-prompt";
import { LinkedInQrPrompt } from "@/components/linkedin-qr-prompt";
import { COLORS } from "@/utils/constants";

import { buildDockActions } from "./dock-actions";
import { useCaptureFlow } from "./use-capture-flow";
import { useDictation } from "./use-dictation";
import { useLinkedInQrCapture } from "./use-linkedin-qr";

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
    pendingCount,
    drainPending,
    eventToName,
    confirmEventName,
    dismissEventPrompt,
    shootCamera,
    pickFromLibrary,
    applyCroppedPhoto,
    submitText,
  } = useCaptureFlow();
  const {
    linkedInQrUrl,
    openError: linkedInOpenError,
    handleLinkedInQrDetected,
    dismissLinkedInPrompt,
    openLinkedInAddForm,
  } = useLinkedInQrCapture(settings);
  const { listening, start: startDictation, stop: stopDictation } = useDictation(text, setText, setVoiceHint);
  // Set when "Save contact" is tapped while dictation is still listening: stopping the
  // recognizer is async (its last transcript chunk can land after stop() returns), so
  // submitting immediately can cut off the words the user just spoke. Deferring the
  // submit to the effect below — which fires once `listening` actually flips to false —
  // guarantees `text` already has whatever the recognizer finalized before we read it.
  const submitAfterDictationStop = useRef(false);

  useEffect(() => {
    if (!listening && submitAfterDictationStop.current) {
      submitAfterDictationStop.current = false;
      submitText();
    }
  }, [listening, submitText]);

  if (!settings) return <View style={styles.screen} />;

  function submitTypedText(): void {
    if (listening) {
      submitAfterDictationStop.current = true;
      stopDictation();
    } else {
      submitText();
    }
  }

  const dockActions = buildDockActions({
    mode,
    listening,
    onVoice: () => {
      setMode("text");
      if (listening) stopDictation();
      else void startDictation();
    },
    onCameraOrShutter: () => (mode === "camera" ? void shootCamera() : setMode("camera")),
    onFile: () => void pickFromLibrary(),
  });

  return (
    <View style={styles.screen}>
      <EventNamePrompt
        visible={eventToName != null}
        onConfirm={(name) => void confirmEventName(name)}
        onSkip={dismissEventPrompt}
      />
      <LinkedInQrPrompt
        url={linkedInQrUrl}
        error={linkedInOpenError}
        onOpen={() => void openLinkedInAddForm()}
        onDismiss={dismissLinkedInPrompt}
      />
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
            <CameraCaptureView ref={cameraRef} onLinkedInQrDetected={handleLinkedInQrDetected} />
          ) : (
            <TextCaptureView value={text} onChangeText={setText} onSubmit={submitTypedText} busy={busy} hint={voiceHint} />
          )}
          <View style={styles.overlay}>
            {outcome ? <ResultBanner outcome={outcome} /> : null}
            {pendingCount > 0 && !busy ? (
              <Pressable style={styles.retry} onPress={() => void drainPending()}>
                <Text style={styles.retryLabel}>
                  Retry {pendingCount} unsent capture{pendingCount === 1 ? "" : "s"}
                </Text>
              </Pressable>
            ) : null}
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
  retry: {
    borderColor: COLORS.amber,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  retryLabel: { color: COLORS.amber, fontSize: 15, fontWeight: "600" },
});
