// Split per the 150-line rule; import paths unchanged (@/lib/repo/contacts).
export {
  listAllTags,
  listContacts,
  listContactsPage,
  listContactFilterOptions,
  findContactIdentityCandidates,
  listMentionMergeCandidates,
  type ContactIdentityCandidate,
  type ContactListItem,
  type RecentContactListItem,
} from "./queries";
export {
  getContact,
  getContactProfile,
  type ContactDetail,
  type PositionView,
} from "./detail";
export {
  createContact,
  createContactProfile,
  findOrCreateCompany,
  updateContact,
} from "./write";
export {
  forgetContact,
  mergeMentionedContact,
  promoteMentionedContact,
} from "./mutations";
export { countAuthoredContacts } from "./authored-count";
export { setStarred } from "./star";
export { mergeContacts } from "./merge";
export { getContactsForMerge, type ContactMergeRecord } from "./merge-preview";
export { findDuplicateContactClusters, type DuplicateContactCluster } from "./duplicates";
export {
  addContactsToCompany,
  addTagToContacts,
  forgetContacts,
  removeTagFromContacts,
  setContactsAffiliation,
  setContactsStarred,
} from "./bulk";
export { setContactsCompany, setContactsLocation } from "./create-group";
