/**
 * Inbound-messaging capture constants — forward a WhatsApp/Telegram contact
 * card, note, or photo to the bot; a batch (a "session") accumulates items
 * until the user replies DONE or the session goes idle, then it is processed
 * into contacts. Split per the 150-line rule: ./config holds the values and the
 * pure routing decisions, ./replies answers one message, ./notices reports what
 * a batch skipped. Import path stays `@/utils/constants/messaging`.
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
  MESSAGING_QUESTION_TTL_MINUTES,
  MESSAGING_REJECTIONS,
  MESSAGING_SESSION_IDLE_MINUTES,
  MESSAGING_SESSION_STATUSES,
  isDoneDelimiter,
  looksLikeLinkToken,
  parseQuestionAnswer,
  type BuiltinMessagingProvider,
  type MessagingItemKind,
  type MessagingQuestionAnswer,
  type MessagingQuestionOption,
  type MessagingRejection,
  type MessagingSessionStatus,
} from "./config";
export {
  ackFirstItemReply,
  awaitingAnswerReply,
  chooseContactReply,
  emptyMessageReply,
  emptySessionReply,
  invalidTokenReply,
  linkedReply,
  locationNoteBody,
  noContactFoundReply,
  notRecognizedReply,
  processingFailedReply,
  processingReply,
  questionAbandonedReply,
  questionAnsweredReply,
  summaryReply,
  unsupportedAttachmentReply,
  voiceUnsupportedReply,
} from "./replies";
export {
  cardUnreadableNotice,
  extraAmbiguityNotice,
  mediaFailedNotice,
  orphanItemNotice,
  photoUnreadableNotice,
  truncatedNotice,
  unreadableItemNotice,
  voiceSkippedNotice,
} from "./notices";
