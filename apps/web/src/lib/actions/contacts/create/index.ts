/**
 * Contact-creation server actions. Split per the 150-line rule: ./create-contact
 * (the full capture-review save + card-scan transcription follow-up) and
 * ./quick-create (the bare-bones inline create used by the add-relationship
 * dialog). Both files keep their own "use server" directive — a re-export
 * barrel isn't itself a Server Actions module, so it stays undirected and just
 * forwards the action references. Import path stays `./create`.
 */
export { createContactAction } from "./create-contact";
export { quickCreateContactAction, type QuickContactResult } from "./quick-create";
