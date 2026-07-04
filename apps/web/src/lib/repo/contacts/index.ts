// Split per the 150-line rule; import paths unchanged (@/lib/repo/contacts).
export {
  getContact,
  listAllTags,
  listContacts,
  type ContactDetail,
  type ContactListItem,
} from "./queries";
export { createContact, findOrCreateCompany, forgetContact } from "./mutations";
