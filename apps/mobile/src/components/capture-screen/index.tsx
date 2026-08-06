import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { CameraCaptureView } from "@/components/camera-capture-view";
import { CropReviewStrip } from "@/components/crop-review/strip";
import { TextCaptureView } from "@/components/text-capture-view";
import { ResultBanner } from "@/components/result-banner";
import { BottomDock } from "@/components/bottom-dock";
import { EventNamePrompt } from "@/components/event-name-prompt";
import { LinkedInQrPrompt } from "@/components/linkedin-qr-prompt";

import { buildDockActions } from "./dock-actions";
import { styles } from "./styles";
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
    pendingPhotos,
    reviewing,
    pendingCount,
    drainPending,
    eventToName,
    confirmEventName,
    dismissEventPrompt,
    shootCamera,
    pickFromLibrary,
    reviewPending,
    removePendingPhoto,
    cropPendingPhoto,
    cancelReview,
    scanPending,
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
      {reviewing && pendingPhotos.length > 0 ? (
        <CropReviewStrip
          photos={pendingPhotos}
          busy={busy}
          onCrop={cropPendingPhoto}
          onRemove={removePendingPhoto}
          onConfirm={() => void scanPending()}
          onCancel={cancelReview}
        />
      ) : (
        <>
          {mode === "camera" ? (
            <CameraCaptureView
              ref={cameraRef}
              pendingCount={pendingPhotos.length}
              onReview={reviewPending}
              onLinkedInQrDetected={handleLinkedInQrDetected}
            />
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
