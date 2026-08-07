/**
 * Module doubles for everything the inbound path writes through, re-exported so
 * every case file keeps importing them from `./mocks`. Split per the 150-line
 * rule: ./session doubles the webhook/batch plumbing and the capture-log audit
 * trail, ./ai doubles the batch planner and the vision/fact models, ./graph
 * doubles what a batch writes into the user's graph.
 */
export {
  afterMock,
  itemRow,
  repoMessagingMock,
  requestScopeMock,
} from "./session";
export { aiMock, batchPlanMock, noteExtractionMock } from "./ai";
export {
  cardImagesMock,
  confirmationsMock,
  contactsMock,
  embeddingsMock,
  notesMock,
  settingsMock,
} from "./graph";
