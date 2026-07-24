/**
 * Voice subtree sub-barrel — a convenience entry point for deep imports of the
 * voice surface: `import { VoiceSession, ... } from "@dhaga/core/src/voice"`.
 *
 * DEEP-IMPORT-ONLY. This barrel is deliberately NOT re-exported from the package
 * root barrel (src/index.ts) and NOT registered in src/services.ts — the root
 * barrel pulls in the Anthropic SDK + zod, which breaks the mobile Hermes
 * runtime. Everything reachable from here is pure TS (Hermes/mobile-safe), the
 * same discipline as geo/geohash.ts and capture/linkedin-qr.ts.
 */
export * from "./types";
export * from "./asr/types";
export * from "./teaching/types";
export * from "./teaching/phonetic";
export * from "./teaching/edit-watcher";
export * from "./correction/types";
export * from "./correction/noop";
export * from "./session";
