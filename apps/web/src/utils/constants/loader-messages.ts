// Cycling, thread-themed status copy for waits that outlast a spinner — the
// slow AI paths (card OCR, extraction, enrichment, briefs, drafts, ask).
// Each set holds on its last line rather than looping, so it never reads as
// "stuck". Kept literal enough to stay honest about the underlying step.

export const LOADER_MESSAGE_INTERVAL_MS = 2200;

export const CARD_SCAN_MESSAGES = [
  "Reading the card…",
  "Making out the details…",
  "Threading it together…",
  "Almost there…",
] as const;

export const QUICK_ADD_MESSAGES = [
  "Reading your note…",
  "Pulling out the details…",
  "Untangling the threads…",
  "Tying it off…",
] as const;

export const ENRICH_MESSAGES = [
  "Searching the open web…",
  "Gathering the loose threads…",
  "Cross-checking what we find…",
  "Weaving it into the thread…",
] as const;

export const BRIEF_MESSAGES = [
  "Reading the room…",
  "Pulling the threads together…",
  "Connecting the dots…",
  "Writing it up…",
] as const;

export const DRAFT_MESSAGES = [
  "Finding the right words…",
  "Matching your voice…",
  "Threading the message…",
  "Adding the finishing touches…",
] as const;

export const ASK_MESSAGES = [
  "Searching your network…",
  "Following the connections…",
  "Reading the receipts…",
  "Piecing it together…",
] as const;
