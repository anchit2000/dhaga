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
