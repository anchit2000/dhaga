/**
 * Inbound-messaging capture constants — forward a WhatsApp/Telegram contact
 * card, note, or photo to the bot; a batch (a "session") accumulates items
 * until the user replies DONE or the session goes idle, then it is processed
 * into contacts. Split per the 150-line rule: ./config holds the values and the
 * pure routing decisions, ./replies answers one message, ./notices reports what
 * a batch skipped, ./plan-gate explains the paid gate on linking a new chat.
 * Import path stays `@/utils/constants/messaging`.
 */
export {
  DONE_DELIMITERS,
  LINK_TOKEN_ALPHABET,
  LINK_TOKEN_LENGTH,
  LINK_TOKEN_TTL_MINUTES,
  MAX_SESSION_ITEMS,
  MESSAGING_ITEM_KINDS,
  MESSAGING_PROVIDER_LABELS,
  MESSAGING_PROVIDERS,
  MESSAGING_MAX_OPEN_ITEMS,
  MESSAGING_PROCESSING_STALL_MINUTES,
  MESSAGING_REJECTIONS,
  MESSAGING_SESSION_IDLE_MINUTES,
  MESSAGING_SESSION_STATUSES,
  NOTE_ATTRIBUTION_BASES,
  UNNAMED_CONTACT_NAME,
  extractLinkToken,
  idleWindowLabel,
  isDoneDelimiter,
  looksLikeLinkToken,
  parseStartCommand,
  type BuiltinMessagingProvider,
  type MessagingItemKind,
  type MessagingRejection,
  type MessagingSessionStatus,
  type NoteAttributionBasis,
} from "./config";
export {
  ackFirstItemReply,
  alreadyLinkedReply,
  awaitingAnswerReply,
  batchFullReply,
  chooseContactQuestion,
  emptyMessageReply,
  emptySessionReply,
  invalidTokenReply,
  linkedReply,
  locationNoteBody,
  noContactFoundReply,
  notRecognizedReply,
  processingFailedReply,
  processingReply,
  summaryReply,
  unsupportedAttachmentReply,
  voiceUnsupportedReply,
} from "./replies";
export {
  cardUnreadableNotice,
  mediaFailedNotice,
  attributionHeader,
  attributionLines,
  orphanItemNotice,
  pendingConfirmationsNotice,
  partialRunNotice,
  photoUnreadableNotice,
  unreadableItemNotice,
  voiceSkippedNotice,
} from "./notices";
export {
  BATCH_FAILURE_REPLIES,
  attachedPersonLine,
  batchFailedReply,
  batchFailureReply,
  createdPersonLine,
  needsInputLine,
  nothingReadableReply,
  unaccountedLine,
} from "./batch-replies";
export {
  MESSAGING_BATCH_FAILURES,
  MESSAGING_BATCH_FAILURE_LABELS,
  MESSAGING_ITEM_OUTCOMES,
  MESSAGING_ITEM_OUTCOME_LABELS,
  batchFailureLabel,
  type MessagingBatchFailure,
  type MessagingItemOutcome,
} from "./outcomes";
export { messagingLinkUrl, telegramLinkUrl, whatsappLinkUrl } from "./links";
export { MESSAGING_LINK_PLAN_GATE_REASON } from "./plan-gate";
