/**
 * Module doubles for everything the inbound path writes through, re-exported so
 * every case file keeps importing them from `./mocks`. Split per the 150-line
 * rule: ./session doubles the webhook/batch plumbing and the AI gateways,
 * ./graph doubles what a batch writes into the user's graph.
 */
export {
  afterMock,
  aiMock,
  confirmationsMock,
  contactExtractionMock,
  itemRow,
  noteExtractionMock,
  repoMessagingMock,
  requestScopeMock,
} from "./session";
export {
  cardImagesMock,
  contactsMock,
  embeddingsMock,
  notesMock,
  settingsMock,
} from "./graph";
