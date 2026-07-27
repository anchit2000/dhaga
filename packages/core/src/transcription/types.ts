/**
 * Server-side speech-to-text CONTRACT — used to turn an inbound voice note
 * (forwarded to the messaging bot) into text before extraction. Same
 * gateway shape as ../llm and ../search: callers depend on the interface,
 * never a concrete provider (Dependency Inversion).
 *
 * DEEP-IMPORT-ONLY (see ../messaging/types) — never re-exported from the
 * package root barrel or src/services.ts. Import as
 * `@dhaga/core/src/transcription`.
 */

export interface TranscriptionInput {
  data: Uint8Array;
  mimeType: string;
}

export interface TranscriptionResult {
  text: string;
  language: string | null;
}

export interface TranscriptionClient {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export interface TranscriptionProvider {
  id: string;
  isConfigured(): boolean;
  createClient(): TranscriptionClient;
}
