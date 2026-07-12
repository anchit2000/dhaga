// Split per the 150-line rule; import paths unchanged (@/lib/repo/contacts).
export {
  getContact,
  listAllTags,
  listContacts,
  listContactsPage,
  listContactFilterOptions,
  findContactIdentityCandidates,
  listMentionMergeCandidates,
  type ContactDetail,
  type ContactIdentityCandidate,
  type ContactListItem,
} from "./queries";
export {
  createContact,
  findOrCreateCompany,
  forgetContact,
  mergeMentionedContact,
  promoteMentionedContact,
} from "./mutations";
