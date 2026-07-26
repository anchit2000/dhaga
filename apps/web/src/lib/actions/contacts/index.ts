// Split per the 150-line rule; import paths unchanged (@/lib/actions/contacts).
export { createContactAction, quickCreateContactAction } from "./create";
export { updateContactAction } from "./update";
export {
  forgetContactAction,
  mergeMentionedContactAction,
  promoteMentionedContactAction,
} from "./lifecycle";
export type { ContactFormState } from "./form";
