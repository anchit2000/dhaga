export interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export type RecognitionCtor = new () => SpeechRecognitionLike;

/** Firefox has no SpeechRecognition constructor at all — the only major
 *  browser where the browser engine is unsupported outright, rather than
 *  present-but-silently-broken (Brave/vanilla Chromium). Split out of
 *  useDictation so SttEngineContext can also check this (Firefox-on-login
 *  detection) without the two modules importing each other. */
export function getSpeechRecognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
