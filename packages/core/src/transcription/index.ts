/**
 * STUB gateway — no built-in provider yet. Register one (OpenAI/Deepgram/Groq
 * Whisper etc.) to enable inbound voice-note transcription. Keyed off a future
 * TRANSCRIPTION_PROVIDER env var.
 */
import type { TranscriptionClient, TranscriptionProvider } from "./types";

export type {
  TranscriptionClient,
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "./types";

/**
 * Transcription gateway — mirrors ../search/index.ts, but ships EMPTY: STT
 * keys land later, so there is no built-in provider to seed. Registering an
 * implementation is all it takes to light up inbound voice notes — zero
 * changes to callers (Open/Closed, Dependency Inversion).
 *
 * DEEP-IMPORT-ONLY (see ./types) — never re-exported from the package root.
 */
const providerStore = globalThis as unknown as {
  __dhagaTranscriptionProviders?: Map<string, TranscriptionProvider>;
};

function transcriptionProviders(): Map<string, TranscriptionProvider> {
  providerStore.__dhagaTranscriptionProviders ??= new Map();
  return providerStore.__dhagaTranscriptionProviders;
}

/** Register an STT provider supplied by this app or an external package. Returns a disposer. */
export function registerTranscriptionProvider(provider: TranscriptionProvider): () => void {
  if (!provider.id.trim()) throw new Error("Transcription provider id cannot be empty");
  transcriptionProviders().set(provider.id, provider);
  return () => {
    transcriptionProviders().delete(provider.id);
  };
}

/** First configured provider wins; throws if none is registered/configured. */
export function getTranscriptionProvider(): TranscriptionProvider {
  for (const provider of transcriptionProviders().values()) {
    if (provider.isConfigured()) return provider;
  }
  throw new Error("No transcription provider configured");
}

export function getTranscriptionClient(): TranscriptionClient {
  return getTranscriptionProvider().createClient();
}

/** True when any registered provider is configured; voice-note features degrade when not. */
export function hasTranscription(): boolean {
  for (const provider of transcriptionProviders().values()) {
    if (provider.isConfigured()) return true;
  }
  return false;
}
