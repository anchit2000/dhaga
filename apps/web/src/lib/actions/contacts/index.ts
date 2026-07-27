// Split per the 150-line rule; import paths unchanged (@/lib/actions/contacts).
export { createContactAction, quickCreateContactAction } from "./create";
export { updateContactAction } from "./update";
export {
  forgetContactAction,
  mergeMentionedContactAction,
  promoteMentionedContactAction,
} from "./lifecycle";
export { loadContactsForMergeAction, mergeContactsAction } from "./merge";
export {
  addContactsToCompanyAction,
  bulkForgetContactsAction,
  bulkStarContactsAction,
  bulkTagContactsAction,
} from "./bulk";
export type { ContactFormState } from "./form";
