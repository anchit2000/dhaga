import { useRef, useState } from "react";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";

/**
 * On-device voice dictation for the capture screen's text box (checklist.md
 * §6 "Voice notes on mobile"). Wraps iOS SFSpeechRecognizer / Android
 * SpeechRecognizer via `expo-speech-recognition` — the mobile equivalent of
 * the web app's browser SpeechRecognition dictation (see
 * apps/web/src/components/app/contact/useDictation.ts): tap to start, tap
 * again to stop, interim words preview live and get "locked in" as each
 * phrase finalizes. `requiresOnDeviceRecognition` is forced on so no audio
 * or transcript ever leaves the device (local-first architecture principle).
 *
 * Mic + speech-recognition permission is requested lazily, on the first tap
 * — never at app launch (same convention as `getScanLocation`).
 */
export function useDictation(text: string, setText: (value: string) => void, setHint: (hint: string | null) => void) {
  const [listening, setListening] = useState(false);
  // The text already in the box when dictation started. Each finalized
  // phrase is appended here; interim phrases preview on top without being
  // committed, so a partial guess never permanently overwrites prior text.
  const baseTextRef = useRef("");

  useSpeechRecognitionEvent("end", () => setListening(false));

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setHint(`Dictation stopped (${event.message || event.error}) — you can keep typing.`);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript.trim();
    if (!transcript) return;
    const merged = baseTextRef.current ? `${baseTextRef.current} ${transcript}` : transcript;
    if (event.isFinal) baseTextRef.current = merged;
    setText(merged);
  });

  async function start(): Promise<void> {
    if (listening) return;
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      setHint("On-device dictation isn't available on this device — type instead.");
      return;
    }
    const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (status !== "granted") {
      setHint("Microphone access is needed for dictation — type instead.");
      return;
    }
    setHint(null);
    baseTextRef.current = text;
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true,
    });
    setListening(true);
  }

  function stop(): void {
    ExpoSpeechRecognitionModule.stop();
  }

  return { listening, start, stop };
}
