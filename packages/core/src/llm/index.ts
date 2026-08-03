// Barrel for the LLM gateway (150-line rule): prompt builders + client types
// re-exported here, provider registry/factories in ./registry. Import paths
// ("./llm") are unchanged.
export type {
  BatchExtractItem,
  BatchExtractResult,
  BatchLLMClient,
  BatchResultStatus,
  CompleteOptions,
  ExtractOptions,
  LLMClient,
  LLMImage,
  LLMResult,
  LLMStream,
  LLMUsage,
  LLMProvider,
  LLMProviderCapabilities,
  ModelTier,
} from "./types";
export { AnthropicLLMClient } from "./anthropic-client";
export { OpenAILLMClient, type OpenAILLMClientOptions } from "./openai-client";
export {
  CONTACT_PARSE_SYSTEM,
  CAPTURE_EXTRACTION_SYSTEM,
  buildContactParsePrompt,
} from "./prompts/contact-parse";
export {
  NOTE_EXTRACTION_SYSTEM,
  ENRICHMENT_EXTRACTION_SYSTEM,
  buildNoteExtractionPrompt,
  buildEnrichmentExtractionPrompt,
  type NodeTypeRef,
} from "./prompts/note-extraction";
export {
  SEARCH_ANSWER_SYSTEM,
  SEARCH_QUERY_SYSTEM,
  buildSearchAnswerPrompt,
  buildSearchQueryPrompt,
} from "./prompts/search";
export {
  DRAFT_SYSTEM,
  buildDraftPrompt,
  type DraftContext,
} from "./prompts/draft";
export {
  ENRICHMENT_SYSTEM,
  buildEnrichmentPrompt,
  type EnrichmentSubject,
} from "./prompts/enrichment";
export {
  BRIEF_SYSTEM,
  buildBriefPrompt,
  type BriefContext,
} from "./prompts/brief";
export { CARD_SCAN_SYSTEM, CARD_SCAN_PROMPT } from "./prompts/card-scan";
export {
  CARD_TRANSCRIPTION_SYSTEM,
  CARD_TRANSCRIPTION_PROMPT,
} from "./prompts/card-transcription";
export { PHOTO_NOTE_SYSTEM, PHOTO_NOTE_PROMPT } from "./prompts/photo-note";
export {
  SIGNAL_DETECTION_SYSTEM,
  buildSignalDetectionPrompt,
  type SignalDetectionSubject,
} from "./prompts/signal-detection";
export {
  PERSON_CLASSIFICATION_SYSTEM,
  buildPersonClassificationPrompt,
  type PersonClassificationSubject,
} from "./prompts/person-classification";
export {
  GOAL_MATCHING_SYSTEM,
  buildGoalMatchingPrompt,
  type GoalMatchingSubject,
} from "./prompts/goal-matching";
export {
  getBatchLLMClient,
  getLLMClient,
  getLLMProvider,
  hasBatchLLM,
  hasLLM,
  registerLLMProvider,
  selectLLMProvider,
} from "./registry";
